import { ConfigurationSchema } from '@gmod/jbrowse-core/configuration'
import PluginManager from '@gmod/jbrowse-core/PluginManager'
import RpcManager from '@gmod/jbrowse-core/rpc/RpcManager'
import {
  getSnapshot,
  resolveIdentifier,
  types,
  getParent,
} from 'mobx-state-tree'
import assemblyManager from '@gmod/jbrowse-core/assemblyManager'
import AssemblyConfigSchemasFactory from './assemblyConfigSchemas'
import corePlugins from './corePlugins'
import sessionModelFactory from './sessionModelFactory'

const pluginManager = new PluginManager(corePlugins.map(P => new P()))
pluginManager.configure()

export const Session = sessionModelFactory(pluginManager)
const { assemblyConfigSchemas, dispatcher } = AssemblyConfigSchemasFactory(
  pluginManager,
)

// poke some things for testing (this stuff will eventually be removed)
window.getSnapshot = getSnapshot
window.resolveIdentifier = resolveIdentifier

const JBrowseWeb = types
  .model('JBrowseWeb', {
    configuration: ConfigurationSchema('Root', {
      rpc: RpcManager.configSchema,
      // possibly consider this for global config editor
      highResolutionScaling: {
        type: 'number',
        defaultValue: 2,
      },
      updateUrl: {
        type: 'boolean',
        defaultValue: true,
      },
      useLocalStorage: {
        type: 'boolean',
        defaultValue: false,
      },
    }),
    assemblies: types.array(
      types.union({ dispatcher }, ...assemblyConfigSchemas),
    ),
    // track configuration is an array of track config schemas. multiple
    // instances of a track can exist that use the same configuration
    tracks: types.array(pluginManager.pluggableConfigSchemaType('track')),
    connections: types.array(
      pluginManager.pluggableConfigSchemaType('connection'),
    ),
    defaultSession: types.optional(types.frozen(Session), {
      name: `New Session`,
      menuBars: [{ type: 'MainMenuBar' }],
    }),
  })
  .actions(self => ({
    addSavedSession(sessionSnapshot) {
      const length = self.savedSessions.push(sessionSnapshot)
      return self.savedSessions[length - 1]
    },
    removeSavedSession(sessionSnapshot) {
      self.savedSessions.remove(sessionSnapshot)
    },
    replaceSavedSession(oldName, snapshot) {
      const savedSessionIndex = self.savedSessions.findIndex(
        savedSession => savedSession.name === oldName,
      )
      self.savedSessions[savedSessionIndex] = snapshot
    },
    addAssemblyConf(assemblyConf) {
      const length = self.assemblies.push(assemblyConf)
      return self.assemblies[length - 1]
    },
    addTrackConf(trackConf) {
      const { type } = trackConf
      if (!type) throw new Error(`unknown track type ${type}`)
      const length = self.tracks.push(trackConf)
      return self.tracks[length - 1]
    },
    addConnectionConf(connectionConf) {
      const { type } = connectionConf
      if (!type) throw new Error(`unknown connection type ${type}`)
      const length = self.connections.push(connectionConf)
      return self.connections[length - 1]
    },
  }))
  .views(self => ({
    get savedSessionNames() {
      return getParent(self).savedSessionNames
    },
  }))
  // Grouping the "assembly manager" stuff under an `extend` just for
  // code organization
  .extend(assemblyManager)
  .volatile(self => ({
    rpcManager: new RpcManager(
      pluginManager,
      self.configuration.rpc,
      {
        ElectronRpcDriver: { workerCreationChannel: 'createWindowWorker' },
      },
      self.getRefNameMapForAdapter,
    ),
    refNameMaps: new Map(),
  }))

export default JBrowseWeb
