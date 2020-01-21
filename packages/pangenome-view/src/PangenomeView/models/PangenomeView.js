export default pluginManager => {
  const {jbrequire} = pluginManager
  const {transaction} = jbrequire('mobx')
  const {types, getParent, getRoot} = jbrequire('mobx-state-tree')
  const {ElementId, Region} = jbrequire('@gmod/jbrowse-core/mst-types')
  const { readConfObject } = jbrequire('@gmod/jbrowse-core/configuration')
  const { clamp , getSession} = jbrequire('@gmod/jbrowse-core/util')

  const minHeight = 100
  const minWidth = 100
  const defaultHeight = 400
  const stateModel = types
    .model('PangenomeView', {
      id: ElementId,
      type: types.literal('PangenomeView'),

      width: 800,
      height: types.optional(
        types.refinement('trackHeight', types.number, n => n >= minHeight),
        defaultHeight,
      ),
    })
    .views(self => ({}))
    .volatile(() => ({
      error: undefined,
    }))
    .actions(self => ({
      // toggle action with a flag stating which mode it's in
      setWidth(newWidth) {
        self.width = Math.max(newWidth, minWidth)
        return self.width
      },
      setHeight(newHeight) {
        self.height = Math.max(newHeight, minHeight)
        return self.height
      },
      resizeHeight(distance) {
        const oldHeight = self.height
        const newHeight = self.setHeight(self.height + distance)
        self.setModelViewWhenAdjust(!self.tooSmallToLock)
        return newHeight - oldHeight
      },
      resizeWidth(distance) {
        const oldWidth = self.width
        const newWidth = self.setWidth(self.width + distance)
        self.setModelViewWhenAdjust(!self.tooSmallToLock)
        return newWidth - oldWidth
      },
      setError(error) {
        self.error = error
      },
    }))

  return { stateModel }
}
