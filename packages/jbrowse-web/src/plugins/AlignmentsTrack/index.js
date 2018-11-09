import { types } from 'mobx-state-tree'

import Plugin, { Track } from '../../Plugin'
import { ConfigurationSchema } from '../../configuration'
import { IdType } from '../../types'

const configSchema = ConfigurationSchema('AlignmentsTrack', {
  defaultView: {
    type: 'string',
    defaultValue: 'pileup',
  },
})

const stateModel = types.model({
  id: IdType,
  viewType: types.literal('linear'),
})

export default class AlignmentsTrackPlugin extends Plugin {
  install(browser) {
    this.browser = browser
    browser.addTrackType(
      new Track({ name: 'alignments', configSchema, stateModel }),
    )
  }
}