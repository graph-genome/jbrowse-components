import AdapterType from '@gmod/jbrowse-core/pluggableElementTypes/AdapterType'
import TrackType from '@gmod/jbrowse-core/pluggableElementTypes/TrackType'
import Plugin from '@gmod/jbrowse-core/Plugin'
import {
  AdapterClass as BigWigAdapterClass,
  configSchema as bigWigAdapterConfigSchema,
} from './BigWigAdapter'
import DensityRenderer, {
  configSchema as densityRendererConfigSchema,
  ReactComponent as DensityRendererReactComponent,
} from './DensityRenderer'
import {
  configSchemaFactory as wiggleTrackConfigSchemaFactory,
  modelFactory as wiggleTrackModelFactory,
} from './WiggleTrack'
import XYPlotRenderer, {
  configSchema as xyPlotRendererConfigSchema,
  ReactComponent as XYPlotRendererReactComponent,
} from './XYPlotRenderer'
import LinePlotRenderer, {
  configSchema as linePlotRendererConfigSchema,
  ReactComponent as LinePlotRendererReactComponent,
} from './LinePlotRenderer'

export default class extends Plugin {
  install(pluginManager) {
    pluginManager.addTrackType(() => {
      const configSchema = wiggleTrackConfigSchemaFactory(pluginManager)
      return new TrackType({
        name: 'WiggleTrack',
        configSchema,
        stateModel: wiggleTrackModelFactory(configSchema),
      })
    })

    pluginManager.addAdapterType(
      () =>
        new AdapterType({
          name: 'BigWigAdapter',
          configSchema: bigWigAdapterConfigSchema,
          AdapterClass: BigWigAdapterClass,
        }),
    )

    pluginManager.addRendererType(
      () =>
        new DensityRenderer({
          name: 'DensityRenderer',
          ReactComponent: DensityRendererReactComponent,
          configSchema: densityRendererConfigSchema,
        }),
    )

    pluginManager.addRendererType(
      () =>
        new LinePlotRenderer({
          name: 'LinePlotRenderer',
          ReactComponent: LinePlotRendererReactComponent,
          configSchema: linePlotRendererConfigSchema,
        }),
    )

    pluginManager.addRendererType(
      () =>
        new XYPlotRenderer({
          name: 'XYPlotRenderer',
          ReactComponent: XYPlotRendererReactComponent,
          configSchema: xyPlotRendererConfigSchema,
        }),
    )
  }
}
