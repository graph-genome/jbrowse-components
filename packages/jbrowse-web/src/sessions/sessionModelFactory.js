import { autorun } from 'mobx'
import { flow, types, getType, addDisposer } from 'mobx-state-tree'

import { readConfObject } from '@gmod/jbrowse-core/configuration'
import { isConfigurationModel } from '@gmod/jbrowse-core/configuration/configurationSchema'
import { openLocation } from '@gmod/jbrowse-core/util/io'

import AssemblyManager from './AssemblyManager'
import sessionConfigFactory from './sessionConfigFactory'

export default (pluginManager, rpcManager) => {
  const minWidth = 384
  const minDrawerWidth = 128
  return types
    .model('Session', {
      name: types.identifier,
      width: types.optional(
        types.refinement(types.integer, width => width >= minWidth),
        512,
      ),
      drawerWidth: types.optional(
        types.refinement(types.integer, width => width >= minDrawerWidth),
        384,
      ),
      views: types.array(pluginManager.pluggableMstType('view', 'stateModel')),
      drawerWidgets: types.map(
        pluginManager.pluggableMstType('drawer widget', 'stateModel'),
      ),
      activeDrawerWidgets: types.map(
        types.reference(
          pluginManager.pluggableMstType('drawer widget', 'stateModel'),
        ),
      ),
      menuBars: types.array(
        pluginManager.pluggableMstType('menu bar', 'stateModel'),
      ),
      configuration: sessionConfigFactory(pluginManager),
      connections: types.map(
        pluginManager.pluggableMstType('connection', 'stateModel'),
      ),
    })
    .volatile(self => ({
      pluginManager,
      rpcManager,
      assemblyManager: new AssemblyManager(rpcManager, self),
      /**
       * this is the globally "selected" object. can be anything.
       * code that wants to deal with this should examine it to see what
       * kind of thing it is.
       */
      selection: undefined,
      /**
       * this is the current "task" that is being performed in the UI.
       * this is usually an object of the form
       * { taskName: "configure", target: thing_being_configured }
       */
      task: undefined,
    }))
    .views(self => ({
      get viewsWidth() {
        // TODO: when drawer is permanent, subtract its width
        return self.width - (self.visibleDrawerWidget ? self.drawerWidth : 0)
      },
      get maxDrawerWidth() {
        return self.width - 256
      },

      get visibleDrawerWidget() {
        let activeDrawerWidget
        for (activeDrawerWidget of self.activeDrawerWidgets.values());
        return activeDrawerWidget
      },

      get trackConfigs() {
        const trackConfigurations = []
        self.configuration.assemblies.forEach(assemblyConf => {
          trackConfigurations.push(...assemblyConf.tracks)
        })
        Array.from(self.connections.keys()).forEach(connectionName => {
          const connectionConf = self.connections.get(connectionName)
          connectionConf.assemblies.forEach(assemblyConf => {
            trackConfigurations.push(
              ...assemblyConf.tracks.map(trackConf => {
                trackConf.connectionName = connectionName
                return trackConf
              }),
            )
          })
        })
        return trackConfigurations
      },
    }))
    .actions(self => ({
      afterCreate() {
        const disposer = autorun(() => {
          self.views.forEach(view => {
            view.setWidth(self.viewsWidth)
          })
        })
        addDisposer(self, disposer)

        self.clearConnections()
        self.configuration.connections.forEach(connectionConf => {
          self.addConnection(connectionConf)
        })
      },

      event(event, target, targetType) {
        return self.pluginManager.actionManager.performAction(
          self,
          targetType,
          event.type,
          target,
        )
      },

      addConnection(connectionConf) {
        const connectionType = pluginManager.getConnectionType(
          connectionConf.type,
        )
        const connectionName = readConfObject(connectionConf, 'name')
        self.connections.set(connectionName, connectionType.stateModel.create())
        self.connections
          .get(connectionName)
          .connect(connectionConf)
          .then(() => self.updateAssemblies())
      },

      removeConnection(connectionName) {
        self.connections.delete(connectionName)
      },

      updateAssemblies() {
        self.assemblyManager.updateAssemblyData(self)
      },

      configure(configSnapshot) {
        self.configuration = getType(self.configuration).create(configSnapshot)
      },

      loadConfig: flow(function* loadConfig(configLocation) {
        let configSnapshot
        try {
          configSnapshot = JSON.parse(
            yield openLocation(configLocation).readFile('utf8'),
          )
          self.configure(configSnapshot)
        } catch (error) {
          console.error('Failed to load config ', error)
          throw error
        }
        return configSnapshot
      }),

      updateWidth(width) {
        let newWidth = Math.floor(width)
        if (newWidth === self.width) return
        if (newWidth < minWidth) newWidth = minWidth
        self.width = newWidth
        if (self.drawerWidth > self.maxDrawerWidth)
          self.drawerWidth = self.maxDrawerWidth
      },

      updateDrawerWidth(drawerWidth) {
        if (drawerWidth === self.drawerWidth) return self.drawerWidth
        let newDrawerWidth = drawerWidth
        if (newDrawerWidth < minDrawerWidth) newDrawerWidth = minDrawerWidth
        if (newDrawerWidth > self.maxDrawerWidth)
          newDrawerWidth = self.maxDrawerWidth
        self.drawerWidth = newDrawerWidth
        return newDrawerWidth
      },

      resizeDrawer(distance) {
        const oldDrawerWidth = self.drawerWidth
        const newDrawerWidth = self.updateDrawerWidth(oldDrawerWidth - distance)
        const actualDistance = oldDrawerWidth - newDrawerWidth
        return actualDistance
      },

      addView(typeName, configuration, initialState = {}) {
        const typeDefinition = pluginManager.getElementType('view', typeName)
        if (!typeDefinition) throw new Error(`unknown view type ${typeName}`)

        const newView = typeDefinition.stateModel.create({
          ...initialState,
          type: typeName,
          configuration,
        })
        self.views.push(newView)
        self.updateAssemblies()
        return newView
      },

      removeView(view) {
        for (const [id, drawerWidget] of self.activeDrawerWidgets) {
          if (
            id === 'configEditor' &&
            drawerWidget.target.configId === view.configuration.configId
          )
            self.hideDrawerWidget(drawerWidget.id)
        }
        self.views.remove(view)
      },

      addLinearGenomeViewOfAssembly(
        assemblyName,
        configuration,
        initialState = {},
      ) {
        configuration.displayRegionsFromAssemblyName = assemblyName
        return self.addView('LinearGenomeView', configuration, initialState)
      },

      addDrawerWidget(
        typeName,
        id,
        initialState = {},
        configuration = { type: typeName },
      ) {
        const typeDefinition = pluginManager.getElementType(
          'drawer widget',
          typeName,
        )
        if (!typeDefinition)
          throw new Error(`unknown drawer widget type ${typeName}`)
        const data = { ...initialState, id, type: typeName, configuration }
        const model = typeDefinition.stateModel.create(data)
        self.drawerWidgets.set(model.id, model)
      },

      showDrawerWidget(
        drawerWidgetId,
        drawerWidgetTypeName,
        initialState = {},
      ) {
        if (!self.drawerWidgets.has(drawerWidgetId)) {
          if (!drawerWidgetTypeName)
            throw new Error(
              `Cannot show drawer widget ${drawerWidgetId}. No drawer widget with that ID exists, and a typeName was not provided to create a new one.`,
            )
          self.addDrawerWidget(
            drawerWidgetTypeName,
            drawerWidgetId,
            initialState,
          )
        }
        if (self.activeDrawerWidgets.has(drawerWidgetId))
          self.activeDrawerWidgets.delete(drawerWidgetId)
        self.activeDrawerWidgets.set(
          drawerWidgetId,
          self.drawerWidgets.get(drawerWidgetId),
        )
      },

      hideDrawerWidget(drawerWidgetId) {
        self.activeDrawerWidgets.delete(drawerWidgetId)
      },

      hideAllDrawerWidgets() {
        self.activeDrawerWidgets.clear()
      },

      addMenuBar(
        typeName,
        initialState = {},
        configuration = { type: typeName },
      ) {
        const typeDefinition = pluginManager.getElementType(
          'menu bar',
          typeName,
        )
        if (!typeDefinition)
          throw new Error(`unknown menu bar type ${typeName}`)
        const data = Object.assign({}, initialState, {
          type: typeName,
          configuration,
        })
        const model = typeDefinition.stateModel.create(data)
        self.menuBars.push(model)
      },

      /**
       * set the global selection, i.e. the globally-selected object.
       * can be a feature, a view, just about anything
       * @param {object} thing
       */
      setSelection(thing) {
        self.selection = thing
        // console.log('selected', thing)
      },

      /**
       * clears the global selection
       */
      clearSelection() {
        self.selection = undefined
        // console.log('selection cleared')
      },

      /**
       * opens a configuration editor to configure the given thing,
       * and sets the current task to be configuring it
       * @param {*} configuration
       */
      editConfiguration(configuration) {
        if (!isConfigurationModel(configuration)) {
          throw new Error(
            'must pass a configuration model to editConfiguration',
          )
        }
        const drawerWidgetId = `configEditor-${configuration.configId}`
        if (!self.drawerWidgets.get(drawerWidgetId))
          self.addDrawerWidget(
            'ConfigurationEditorDrawerWidget',
            drawerWidgetId,
            { target: configuration },
          )
        const editor = self.drawerWidgets.get(drawerWidgetId)
        editor.setTarget(configuration)
        self.showDrawerWidget(drawerWidgetId)
      },

      clearConnections() {
        self.connections.clear()
        self.updateAssemblies()
      },
    }))
}

// a track is a combination of a dataset and a renderer, along with some conditions
// specifying in which contexts it is available (which assemblies, which views, etc)