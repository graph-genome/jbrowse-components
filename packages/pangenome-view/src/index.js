export default class PangenomeViewPlugin {
  install(pluginManager) {
    pluginManager.addViewType(() =>
      pluginManager.jbrequire(require('./PangenomeView')),
    )
  }

  configure() {}
}
