import {
  ConfigurationReference,
  getConf,
} from '@gmod/jbrowse-core/configuration'
import { isAbortException, getSession } from '@gmod/jbrowse-core/util'
import {
  getContainingView,
  getParentRenderProps,
  getTrackAssemblyName,
} from '@gmod/jbrowse-core/util/tracks'
import blockBasedTrackModel, {
  BlockBasedTrackStateModel,
} from '@gmod/jbrowse-plugin-linear-genome-view/src/BasicTrack/blockBasedTrackModel'
import { autorun } from 'mobx'
import { addDisposer, getSnapshot, isAlive, types } from 'mobx-state-tree'
import React from 'react'
import { getNiceDomain } from '../util'
import WiggleTrackComponent from './components/WiggleTrackComponent'

// using a map because it preserves order
const rendererTypes = new Map([
  ['xyplot', 'XYPlotRenderer'],
  ['density', 'DensityRenderer'],
  ['line', 'LinePlotRenderer'],
])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stateModelFactory = (configSchema: any) =>
  types
    .compose(
      'WiggleTrack',
      blockBasedTrackModel as BlockBasedTrackStateModel,
      types
        .model({
          type: types.literal('WiggleTrack'),
          configuration: ConfigurationReference(configSchema),
          selectedRendering: types.optional(types.string, ''),
        })
        .volatile(() => ({
          // avoid circular reference since WiggleTrackComponent receives this model
          ReactComponent: (WiggleTrackComponent as unknown) as React.FC,
          ready: false,
          stats: undefined as
            | undefined
            | { scoreMin: number; scoreMax: number; [key: string]: number },
          statsFetchInProgress: undefined as undefined | AbortController,
        })),
    )
    .actions(self => {
      return {
        updateStats(stats: { scoreMin: number; scoreMax: number }) {
          self.stats = stats
          self.ready = true
        },

        setLoading(aborter: AbortController) {
          if (
            self.statsFetchInProgress !== undefined &&
            !self.statsFetchInProgress.signal.aborted
          ) {
            self.statsFetchInProgress.abort()
          }
          self.statsFetchInProgress = aborter
        },
      }
    })
    .views(self => ({
      get rendererTypeName() {
        const viewName = getConf(self, 'defaultRendering')
        const rendererType = rendererTypes.get(viewName)
        if (!rendererType)
          throw new Error(`unknown alignments view name ${viewName}`)
        return rendererType
      },

      get domain() {
        return self.stats
          ? getNiceDomain({
              domain: [self.stats.scoreMin, self.stats.scoreMax],
              scaleType: getConf(self, 'scaleType'),
              bounds: [getConf(self, 'minScore'), getConf(self, 'maxScore')],
            })
          : undefined
      },
      get renderProps() {
        const config = self.rendererType.configSchema.create(
          getConf(self, ['renderers', this.rendererTypeName]) || {},
        )
        return {
          ...getParentRenderProps(self),
          notReady: !self.ready,
          trackModel: self,
          config,
          scaleOpts: {
            domain: this.domain,
            stats: self.stats,
            autoscaleType: getConf(self, 'autoscale'),
            scaleType: getConf(self, 'scaleType'),
            inverted: getConf(self, 'inverted'),
          },
          height: self.height,
        }
      },
    }))
    .actions(self => {
      async function getStats(signal: AbortSignal) {
        const { rpcManager } = getSession(self) as {
          rpcManager: { call: Function }
        }
        const nd = getConf(self, 'numStdDev')
        const autoscaleType = getConf(self, 'autoscale', {})
        const { adapter } = self.configuration
        if (autoscaleType === 'global' || autoscaleType === 'globalsd') {
          const r = await rpcManager.call('statsGathering', 'getGlobalStats', {
            adapterConfig: getSnapshot(adapter),
            adapterType: adapter.type,
            signal,
          })
          return autoscaleType === 'globalsd'
            ? {
                ...r,
                // avoid unnecessary scoreMin<0 if the scoreMin is never less than 0
                // helps with most bigwigs just being >0
                scoreMin:
                  r.scoreMin >= 0 ? 0 : r.scoreMean - nd * r.scoreStdDev,
                scoreMax: r.scoreMean + nd * r.scoreStdDev,
              }
            : r
        }
        if (autoscaleType === 'local' || autoscaleType === 'localsd') {
          const { dynamicBlocks, bpPerPx } = getContainingView(self)
          const r = await rpcManager.call(
            'statsGathering',
            'getMultiRegionStats',
            {
              adapterConfig: getSnapshot(adapter),
              adapterType: adapter.type,
              assemblyName: getTrackAssemblyName(self),
              regions: JSON.parse(JSON.stringify(dynamicBlocks.blocks)),
              signal,
              bpPerPx,
            },
          )
          return autoscaleType === 'localsd'
            ? {
                ...r,
                // avoid unnecessary scoreMin<0 if the scoreMin is never less than 0
                // helps with most bigwigs just being >0
                scoreMin:
                  r.scoreMin >= 0 ? 0 : r.scoreMean - nd * r.scoreStdDev,
                scoreMax: r.scoreMean + nd * r.scoreStdDev,
              }
            : r
        }
        if (autoscaleType === 'zscale') {
          return rpcManager.call('statsGathering', 'getGlobalStats', {
            adapterConfig: getSnapshot(adapter),
            adapterType: adapter.type,
            signal,
          })
        }
        return {}
      }
      return {
        afterAttach() {
          addDisposer(
            self,
            autorun(
              async () => {
                try {
                  const aborter = new AbortController()
                  self.setLoading(aborter)
                  const stats = await getStats(aborter.signal)
                  if (isAlive(self)) {
                    self.updateStats(stats)
                  }
                } catch (e) {
                  if (!isAbortException(e) && isAlive(self)) {
                    self.setError(e)
                  }
                }
              },
              { delay: 1000 },
            ),
          )
        },
      }
    })

export type WiggleTrackModel = ReturnType<typeof stateModelFactory>

export default stateModelFactory
