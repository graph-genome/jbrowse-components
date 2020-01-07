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
  import SNPTrackComponent from './components/SNPTrackComponent'
  
  // using a map because it preserves order
  const rendererTypes = new Map([
    ['snpxy', 'SNPXYRenderer'],
  ])
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateModelFactory = (configSchema: any) =>
    types
      .compose(
        'SNPTrack',
        blockBasedTrackModel as BlockBasedTrackStateModel,
        types
          .model({
            type: types.literal('SNPTrack'),
            configuration: ConfigurationReference(configSchema),
            selectedRendering: types.optional(types.string, ''),
          })
          .volatile(() => ({
            // avoid circular reference since SNPTrackComponent receives this model
            ReactComponent: (SNPTrackComponent as unknown) as React.FC,
            ready: true, //false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fullFeatureList: [] as any,
            stats: undefined as undefined | any,
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

          updateFeatureList(featureList: Array<any>){
            if(!JSON.stringify(self.fullFeatureList).includes(JSON.stringify(featureList)))
              self.fullFeatureList = [...self.fullFeatureList, ...featureList]
          }
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
            fullFeatureList: self.fullFeatureList,
          }
        },
      }))
      .actions(self => {
        function getStats(signal: AbortSignal) { // main source of problem, look here, not getting stats
          const { rpcManager } = getSession(self) as {
            rpcManager: { call: Function }
          }
          const autoscaleType = getConf(self, 'autoscale', {})
          // if (autoscaleType === 'global') {
          //   return rpcManager.call('statsGathering', 'getGlobalStats', {
          //     adapterConfig: getSnapshot(self.configuration.adapter),
          //     adapterType: self.configuration.adapter.type,
          //     signal,
          //   })
          // } // most likely removed, not needed for bam/cram
          // if (autoscaleType === 'local') {
          //   const { dynamicBlocks, bpPerPx } = getContainingView(self)
          //   return rpcManager.call('statsGathering', 'getMultiRegionStats', {
          //     adapterConfig: getSnapshot(self.configuration.adapter),
          //     adapterType: self.configuration.adapter.type,
          //     assemblyName: getTrackAssemblyName(self),
          //     regions: JSON.parse(JSON.stringify(dynamicBlocks.blocks)),
          //     signal,
          //     bpPerPx,
          //   })
          // }
          // if (autoscaleType === 'zscale') {
          //   return rpcManager.call('statsGathering', 'getGlobalStats', {
          //     adapterConfig: getSnapshot(self.configuration.adapter),
          //     adapterType: self.configuration.adapter.type,
          //     signal,
          //   })
        
          // most likely removed, not needed for bam/cram
          return {scoreMin: 0, scoreMax: 50}// return a constant, min: 0 max: 50 and fill out rest too
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
                      self.updateStats(stats) // will not work for alignment tracks, only works in wiggle folder
                    }
                  } catch (e) {
                    if (!isAbortException(e)) {
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
  
  export type SNPTrackModel = ReturnType<typeof stateModelFactory>
  
  export default stateModelFactory
  