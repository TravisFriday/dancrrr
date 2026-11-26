// React wrappers for Google's Material 3 web components (@material/web).
import * as React from 'react'
import { createComponent, type EventName } from '@lit/react'
import { MdIcon } from '@material/web/icon/icon.js'
import { MdIconButton } from '@material/web/iconbutton/icon-button.js'
import { MdFab } from '@material/web/fab/fab.js'
import { MdFilledButton } from '@material/web/button/filled-button.js'
import { MdFilledTonalButton } from '@material/web/button/filled-tonal-button.js'
import { MdTextButton } from '@material/web/button/text-button.js'
import { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field.js'
import { MdSwitch } from '@material/web/switch/switch.js'
import { MdSlider } from '@material/web/slider/slider.js'
import { MdList } from '@material/web/list/list.js'
import { MdListItem } from '@material/web/list/list-item.js'
import { MdDivider } from '@material/web/divider/divider.js'
import { MdMenu } from '@material/web/menu/menu.js'
import { MdMenuItem } from '@material/web/menu/menu-item.js'
import { MdDialog } from '@material/web/dialog/dialog.js'
import { MdChipSet } from '@material/web/chips/chip-set.js'
import { MdFilterChip } from '@material/web/chips/filter-chip.js'
import { MdLinearProgress } from '@material/web/progress/linear-progress.js'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const make = <E extends HTMLElement, V extends Record<string, EventName | string> = {}>(
  tagName: string,
  elementClass: { new (): E },
  events?: V,
) => createComponent<E, V>({ react: React, tagName, elementClass, events: events ?? ({} as V) })

const inputEvents = { onInput: 'input' as EventName<InputEvent>, onChange: 'change' as EventName<Event> }

export const Icon = make('md-icon', MdIcon)
export const IconButton = make('md-icon-button', MdIconButton)
export const Fab = make('md-fab', MdFab)
export const FilledButton = make('md-filled-button', MdFilledButton)
export const TonalButton = make('md-filled-tonal-button', MdFilledTonalButton)
export const TextButton = make('md-text-button', MdTextButton)
export const TextField = make('md-outlined-text-field', MdOutlinedTextField, inputEvents)
export const Switch = make('md-switch', MdSwitch, inputEvents)
export const Slider = make('md-slider', MdSlider, inputEvents)
export const List = make('md-list', MdList)
export const ListItem = make('md-list-item', MdListItem)
export const Divider = make('md-divider', MdDivider)
export const Menu = make('md-menu', MdMenu, { onClosed: 'closed' as EventName<Event> })
export const MenuItem = make('md-menu-item', MdMenuItem)
export const Dialog = make('md-dialog', MdDialog, { onClosed: 'closed' as EventName<Event> })
export const ChipSet = make('md-chip-set', MdChipSet)
export const FilterChip = make('md-filter-chip', MdFilterChip)
export const LinearProgress = make('md-linear-progress', MdLinearProgress)
