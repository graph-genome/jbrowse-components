export default pluginManager => {
  const { jbrequire } = pluginManager
  const { observer } = jbrequire('mobx-react')
  const React = jbrequire('react')
  const { useState, useRef } = React

  const { makeStyles } = jbrequire('@material-ui/core/styles')
  const Icon = jbrequire('@material-ui/core/Icon')
  const Menu = jbrequire('@material-ui/core/Menu')
  const MenuItem = jbrequire('@material-ui/core/MenuItem')
  const ListItemIcon = jbrequire('@material-ui/core/ListItemIcon')
  const ListItemText = jbrequire('@material-ui/core/ListItemText')

  const { iterMap } = jbrequire('@gmod/jbrowse-core/util')

  const useStyles = makeStyles((/* theme */) => {
    return {
      sortIcon: { minWidth: 28 },
      sortCheckmark: { minWidth: 28 },
    }
  })

  const DataTypeSubMenu = observer(
    ({
      columnNumber,
      spreadsheetModel,
      currentTypeName,
      displayName,
      isChecked,
      menuItems,
      onClose = () => {},
    }) => {
      const [menuOpen, setMenuOpen] = useState(false)
      const menuItemRef = useRef(null)

      return (
        <>
          <MenuItem
            ref={menuItemRef}
            onClick={() => {
              setMenuOpen(true)
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small">{isChecked ? 'check' : 'blank'}</Icon>
            </ListItemIcon>
            <ListItemText primary={displayName} />
            <ListItemIcon>
              <Icon fontSize="small">arrow_right</Icon>
            </ListItemIcon>
          </MenuItem>
          <Menu
            anchorEl={menuOpen && menuItemRef.current}
            keepMounted
            open={Boolean(menuOpen)}
            onClose={() => setMenuOpen(false)}
            elevation={10}
            getContentAnchorEl={null}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            {menuItems.map(({ typeName, displayName: name }) => {
              return (
                <MenuItem
                  onClick={() => {
                    spreadsheetModel.setColumnType(columnNumber, typeName)
                    setMenuOpen(false)
                    onClose()
                  }}
                >
                  <ListItemIcon>
                    <Icon fontSize="small">
                      {typeName === currentTypeName ? 'check' : 'blank'}
                    </Icon>
                  </ListItemIcon>
                  <ListItemText primary={name} />
                </MenuItem>
              )
            })}
          </Menu>
        </>
      )
    },
  )

  const ColumnMenu = observer(
    ({ viewModel, spreadsheetModel, currentColumnMenu, setColumnMenu }) => {
      const classes = useStyles()

      const columnMenuClose = () => {
        setDataTypeMenuOpen(false)
        setColumnMenu(null)
      }

      const columnNumber = currentColumnMenu && currentColumnMenu.colNumber

      const sortMenuClick = descending => {
        columnMenuClose()
        spreadsheetModel.setSortColumns([
          {
            columnNumber,
            descending,
          },
        ])
      }

      const filterMenuClick = () => {
        columnMenuClose()
        viewModel.filterControls.addBlankColumnFilter(columnNumber)
      }

      const [dataTypeMenuOpen, setDataTypeMenuOpen] = useState(false)
      const dataTypeMenuItemRef = useRef(null)

      const { dataTypeChoices } = spreadsheetModel

      // make a Map of categoryName => [entry...]
      const dataTypeTopLevelMenu = new Map()
      dataTypeChoices.forEach(dataTypeRecord => {
        const { displayName, categoryName } = dataTypeRecord
        if (categoryName) {
          if (!dataTypeTopLevelMenu.has(categoryName)) {
            dataTypeTopLevelMenu.set(categoryName, {
              isCategory: true,
              subMenuItems: [],
            })
          }
          dataTypeTopLevelMenu
            .get(categoryName)
            .subMenuItems.push(dataTypeRecord)
        } else {
          dataTypeTopLevelMenu.set(displayName, dataTypeRecord)
        }
      })

      const dataType =
        currentColumnMenu && spreadsheetModel.columns[columnNumber].dataType
      const dataTypeName = (dataType && dataType.type) || ''
      const dataTypeDisplayName =
        (currentColumnMenu &&
          spreadsheetModel.columns[columnNumber].dataType.displayName) ||
        ''

      const isSortingAscending = Boolean(
        spreadsheetModel.sortColumns.length &&
          currentColumnMenu &&
          spreadsheetModel.sortColumns.find(
            col =>
              col.columnNumber === currentColumnMenu.colNumber &&
              !col.descending,
          ),
      )
      const isSortingDescending = Boolean(
        spreadsheetModel.sortColumns.length &&
          currentColumnMenu &&
          spreadsheetModel.sortColumns.find(
            col =>
              col.columnNumber === currentColumnMenu.colNumber &&
              col.descending,
          ),
      )
      function stopSortingClick() {
        columnMenuClose()
        spreadsheetModel.setSortColumns([])
      }

      return (
        <>
          {/* top-level column menu =========================  */}
          <Menu
            anchorEl={currentColumnMenu && currentColumnMenu.anchorEl}
            keepMounted
            open={Boolean(currentColumnMenu)}
            onClose={columnMenuClose}
            elevation={8}
            getContentAnchorEl={null}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem
              onClick={
                isSortingAscending
                  ? stopSortingClick
                  : sortMenuClick.bind(null, false)
              }
            >
              <ListItemIcon className={classes.sortIcon}>
                <Icon style={{ transform: 'scale(1,-1)' }} fontSize="small">
                  sort
                </Icon>
              </ListItemIcon>
              <ListItemIcon className={classes.sortCheckmark}>
                <Icon fontSize="small">
                  {isSortingAscending ? 'check' : 'blank'}
                </Icon>
              </ListItemIcon>{' '}
              <ListItemText primary="Sort ascending" />
            </MenuItem>
            <MenuItem
              onClick={
                isSortingDescending
                  ? stopSortingClick
                  : sortMenuClick.bind(null, true)
              }
            >
              <ListItemIcon className={classes.sortIcon}>
                <Icon fontSize="small">sort</Icon>
              </ListItemIcon>
              <ListItemIcon className={classes.sortCheckmark}>
                <Icon fontSize="small">
                  {isSortingDescending ? 'check' : 'blank'}
                </Icon>
              </ListItemIcon>
              <ListItemText primary="Sort descending" />
            </MenuItem>
            <MenuItem
              ref={dataTypeMenuItemRef}
              onClick={() => {
                setDataTypeMenuOpen(true)
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small">perm_data_setting</Icon>
              </ListItemIcon>
              <ListItemText primary={`Type: ${dataTypeDisplayName}`} />
              <ListItemIcon>
                <Icon fontSize="small">arrow_right</Icon>
              </ListItemIcon>
            </MenuItem>
            {/* don't display the filter item if this data type doesn't have filtering implemented */
            !(dataType && dataType.hasFilter) ? null : (
              <MenuItem onClick={filterMenuClick.bind(null, true)}>
                <ListItemIcon>
                  <Icon fontSize="small">filter_list</Icon>
                </ListItemIcon>
                <ListItemText primary="Create filter" />
              </MenuItem>
            )}
          </Menu>

          {/* data type menu =========================  */}
          <Menu
            anchorEl={
              currentColumnMenu &&
              dataTypeMenuItemRef &&
              dataTypeMenuItemRef.current
            }
            open={Boolean(currentColumnMenu && dataTypeMenuOpen)}
            onClose={columnMenuClose}
            elevation={10}
            getContentAnchorEl={null}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            {iterMap(
              dataTypeTopLevelMenu.entries(),
              ([displayName, record]) => {
                const { typeName, subMenuItems } = record
                if (subMenuItems) {
                  return (
                    <DataTypeSubMenu
                      key={`category-${displayName}`}
                      columnNumber={columnNumber}
                      spreadsheetModel={spreadsheetModel}
                      currentTypeName={dataTypeName}
                      isChecked={Boolean(
                        subMenuItems.find(i => i.typeName === dataTypeName),
                      )}
                      onClose={columnMenuClose}
                      displayName={displayName}
                      menuItems={subMenuItems}
                    />
                  )
                }
                if (typeName) {
                  return (
                    <MenuItem
                      key={typeName}
                      onClick={() => {
                        spreadsheetModel.setColumnType(columnNumber, typeName)
                        columnMenuClose()
                      }}
                    >
                      <ListItemIcon>
                        <Icon fontSize="small">
                          {dataTypeName === typeName ? 'check' : 'blank'}
                        </Icon>
                      </ListItemIcon>
                      <ListItemText primary={displayName || typeName} />
                    </MenuItem>
                  )
                }
                return null
              },
            )}
          </Menu>
          {iterMap(dataTypeTopLevelMenu.entries(), ([, { ref, types }]) => {
            if (ref && types) {
              return (
                <Menu
                  anchorEl={ref && ref.current}
                  open={Boolean(currentColumnMenu && dataTypeMenuOpen)}
                  onClose={columnMenuClose}
                  elevation={10}
                  getContentAnchorEl={null}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                ></Menu>
              )
            }
            return null
          })}
        </>
      )
    },
  )
  return ColumnMenu
}
