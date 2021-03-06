import {
  getTypeNamesFromExplicitlyTypedUnion,
  isConfigurationSchemaType,
  isConfigurationSlotType,
} from '@gmod/jbrowse-core/configuration/configurationSchema'
import { iterMap } from '@gmod/jbrowse-core/util'
import FormGroup from '@material-ui/core/FormGroup'
import FormLabel from '@material-ui/core/FormLabel'
import { makeStyles } from '@material-ui/core/styles'
import { observer, PropTypes as MobxPropTypes } from 'mobx-react'
import { getMembers } from 'mobx-state-tree'
import { singular } from 'pluralize'
import React, { Fragment } from 'react'
import SlotEditor from './SlotEditor'
import TypeSelector from './TypeSelector'

const useMemberStyles = makeStyles(theme => ({
  subSchemaContainer: {
    marginLeft: theme.spacing(1),
    borderLeft: `1px solid ${theme.palette.secondary.main}`,
    paddingLeft: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
}))

const Member = observer(props => {
  const classes = useMemberStyles()
  const { slotName, slotSchema, schema, slot = schema[slotName] } = props
  let typeSelector
  if (isConfigurationSchemaType(slotSchema)) {
    if (slot.length) {
      return (
        <Fragment>
          {slot.map((subslot, slotIndex) => {
            const key = `${singular(slotName)} ${slotIndex + 1}`
            return <Member {...props} key={key} slot={subslot} slotName={key} />
          })}
        </Fragment>
      )
    }
    // if this is an explicitly typed schema, make a type-selecting dropdown
    // that can be used to change its type
    const typeNameChoices = getTypeNamesFromExplicitlyTypedUnion(slotSchema)
    if (typeNameChoices.length) {
      typeSelector = (
        <TypeSelector
          typeNameChoices={typeNameChoices}
          slotName={slotName}
          slot={slot}
          onChange={evt => {
            if (evt.target.value !== slot.type)
              schema.setSubschema(slotName, { type: evt.target.value })
          }}
        />
      )
    }
    return (
      <>
        <FormLabel>{slotName}</FormLabel>
        <div className={classes.subSchemaContainer}>
          {typeSelector}
          <FormGroup>
            <Schema schema={slot} />
          </FormGroup>
        </div>
      </>
    )
  }

  if (isConfigurationSlotType(slotSchema)) {
    // this is a regular config slot
    return <SlotEditor key={slotName} slot={slot} slotSchema={slotSchema} />
  }

  return null
})

const Schema = observer(({ schema }) => {
  return iterMap(
    Object.entries(getMembers(schema).properties),
    ([slotName, slotSchema]) => (
      <Member key={slotName} {...{ slotName, slotSchema, schema }} />
    ),
  )
})

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(1, 3, 1, 1),
    background: theme.palette.background.default,
    overflowX: 'hidden',
  },
}))

function ConfigurationEditor({ model }) {
  const classes = useStyles()
  return (
    <div className={classes.root} data-testid="configEditor">
      {!model.target ? 'no target set' : <Schema schema={model.target} />}
    </div>
  )
}
ConfigurationEditor.propTypes = {
  model: MobxPropTypes.objectOrObservableObject.isRequired,
}

export default observer(ConfigurationEditor)
