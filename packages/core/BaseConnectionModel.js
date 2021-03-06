import { getParent, types } from 'mobx-state-tree'

export default pluginManager => {
  return types
    .model('Connection', {
      name: types.identifier,
      tracks: types.array(pluginManager.pluggableConfigSchemaType('track')),
    })
    .views(self => ({
      get assemblyConf() {
        let configParent = self.configuration
        do {
          configParent = getParent(configParent)
        } while (!configParent.assembly)
        return configParent.assembly
      },
    }))
    .actions(self => ({
      afterAttach() {
        self.connect(self.configuration)
      },
      addTrackConf(trackConf) {
        const length = self.tracks.push(trackConf)
        return self.tracks[length - 1]
      },
      setTrackConfs(trackConfs) {
        self.tracks = trackConfs
        return self.track
      },
      clear() {},
    }))
}
