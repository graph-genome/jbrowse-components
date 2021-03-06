import { types } from 'mobx-state-tree'
import { ElementId } from '../../mst-types'

export const HelloWorldMenuBarModelFactory = pluginManager =>
  types.model('HelloWorldMenuBar', {
    id: ElementId,
    type: types.literal('HelloWorldMenuBar'),
  })

export const HelloWorldDrawerWidgetModelFactory = pluginManager =>
  types.model('HelloWorldDrawerWidget', {
    id: ElementId,
    type: types.literal('HelloWorldDrawerWidget'),
  })
