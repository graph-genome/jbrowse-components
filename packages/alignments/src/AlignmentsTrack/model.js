import {
  ConfigurationReference,
  getConf,
} from '@gmod/jbrowse-core/configuration'
import { getParentRenderProps } from '@gmod/jbrowse-core/util/tracks'
import { getSession } from '@gmod/jbrowse-core/util'
import {
  blockBasedTrackModel,
  renderBlockEffect,
  renderBlockData,
} from '@gmod/jbrowse-plugin-linear-genome-view'

import { types, getSnapshot } from 'mobx-state-tree'

// using a map because it preserves order
const rendererTypes = new Map([
  ['pileup', 'PileupRenderer'],
  ['svg', 'SvgFeatureRenderer'],
])

export default (pluginManager, configSchema) =>
  types.compose(
    'AlignmentsTrack',
    blockBasedTrackModel,
    types
      .model({
        type: types.literal('AlignmentsTrack'),
        configuration: ConfigurationReference(configSchema),
      })
      .actions(self => ({
        selectFeature(feature) {
          const session = getSession(self)
          const featureWidget = session.addDrawerWidget(
            'AlignmentsFeatureDrawerWidget',
            'alignmentFeature',
            { featureData: feature.data },
          )
          session.showDrawerWidget(featureWidget)
          session.setSelection(feature)
        },

        async renderSvg() {
          console.warn('here!', self.blockState, getSnapshot(self.blockState))
          console.log(self.blockState.values())
          for (const block of self.blockState.values()) {
            console.log(block)
            const data = renderBlockData(block, true)
            console.log(data)
            const rendering = await renderBlockEffect(block, data)
            console.log(rendering, block, getSnapshot(block))
          }
        },
      }))
      .views(self => ({
        /**
         * the renderer type name is based on the "view"
         * selected in the UI: pileup, coverage, etc
         */
        get rendererTypeName() {
          const viewName = getConf(self, 'defaultRendering')
          const rendererType = rendererTypes.get(viewName)
          if (!rendererType)
            throw new Error(`unknown alignments view name ${viewName}`)
          return rendererType
        },

        /**
         * the react props that are passed to the Renderer when data
         * is rendered in this track
         */
        get renderProps() {
          // view -> [tracks] -> [blocks]
          const config = self.rendererType.configSchema.create(
            getConf(self, ['renderers', self.rendererTypeName]) || {},
          )
          return {
            ...self.composedRenderProps,
            ...getParentRenderProps(self),
            trackModel: self,
            config,
          }
        },
      })),
  )
