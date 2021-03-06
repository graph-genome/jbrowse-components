import { types } from 'mobx-state-tree'
import { ElementId } from '@gmod/jbrowse-core/mst-types'

export default pluginManager =>
  types.model('AddTrackModel', {
    id: ElementId,
    type: types.literal('AddTrackDrawerWidget'),
    view: types.safeReference(
      pluginManager.pluggableMstType('view', 'stateModel'),
    ),
  })
