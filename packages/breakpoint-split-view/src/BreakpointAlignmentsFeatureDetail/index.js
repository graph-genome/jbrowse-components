import { ConfigurationSchema } from '@gmod/jbrowse-core/configuration'
import { ElementId } from '@gmod/jbrowse-core/mst-types'
import { types } from 'mobx-state-tree'

const configSchema = ConfigurationSchema('BreakpointAlignmentsDrawerWidget', {})

const stateModel = types
  .model('BreakpointAlignmentsDrawerWidget', {
    id: ElementId,
    type: types.literal('BreakpointAlignmentsDrawerWidget'),
    featureData: types.frozen({}),
  })
  .actions(self => ({
    setFeatureData(data) {
      self.featureData = data
    },
    clearFeatureData() {
      self.featureData = {}
    },
  }))

export { configSchema, stateModel }
export const ReactComponent = import('./BreakpointAlignmentsFeatureDetail')
