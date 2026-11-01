/**
 * IntelliJ IDEA "Islands" UI themes (the default look since IntelliJ 2025.3).
 *
 * Every value here is resolved from the official theme sources in the
 * intellij-community repository:
 *   platform/platform-resources/src/themes/islands/ManyIslandsDark.theme.json
 *   platform/platform-resources/src/themes/islands/ManyIslandsLight.theme.json
 * The original theme key is noted next to each token where it is not obvious.
 * See docs/RESEARCH.md for how these were extracted.
 */

export type ThemeId = 'islands-dark' | 'islands-light'

export interface UiTheme {
  id: ThemeId
  name: string
  dark: boolean
  vars: Record<string, string>
}

export const islandsDark: UiTheme = {
  id: 'islands-dark',
  name: 'Islands Dark',
  dark: true,
  vars: {
    '--main-bg': '#26282C', // MainWindow.background, MainToolbar.background, StatusBar.background, ToolWindow.Stripe.background
    '--island-bg': '#191A1C', // ToolWindow.background, EditorTabs.background, editor TEXT background
    '--fg': '#D1D3D9', // *.foreground (text-default)
    '--fg-muted': '#9FA2A8', // text-muted, ToolWindow.Button.foreground, StatusBar.Widget.foreground
    '--fg-secondary': '#73767C', // text-secondary
    '--fg-disabled': '#4C4F56',
    '--hover-bg': '#FFFFFF17', // ActionButton.hoverBackground
    '--pressed-bg': '#FFFFFF29', // ActionButton.pressedBackground
    '--tree-hover-bg': '#FFFFFF10', // Tree.hoverBackground
    '--selection-bg': '#2A4371', // *.selectionBackground
    '--selection-inactive-bg': '#33353B', // *.selectionInactiveBackground
    '--separator': '#FFFFFF21', // MainToolbar.separatorColor
    '--border': '#33353B', // Popup.borderColor, Separator.separatorColor
    '--component-border': '#40434A', // Component.borderColor
    '--accent': '#3871E1', // ToolWindow.Button.selectedBackground, Button.default.startBackground
    '--accent-fg': '#FFFFFF',
    '--link': '#71A1FE',
    '--popup-bg': '#26282C', // Popup.background
    '--tooltip-bg': '#33353B',
    '--tab-selected-bg': '#233558', // EditorTabs.underlinedTabBackground
    '--tab-selected-border': '#2E4D89', // EditorTabs.underlinedBorderColor
    '--tab-inactive-selected-bg': '#26282C', // EditorTabs.inactiveUnderlinedTabBackground
    '--tab-inactive-selected-border': '#40434A',
    '--error': '#F57E84', // Label.errorForeground
    '--warning': '#D59637',
    '--success': '#6DB083',
    '--run-green': '#57965C',
    '--run-running-bg': '#338555', // RunWidget.runningBackground
    '--stop-bg': '#C54E58', // RunWidget.stopBackground
    '--editor-fg': '#BCBEC4',
    '--wrong-ref': '#F75464', // scheme WRONG_REFERENCES_ATTRIBUTES
    '--gotit-bg': '#2E4D89', // GotItTooltip.background (intro tour)
    '--gotit-border': '#2E4D89', // GotItTooltip.borderColor
    '--gotit-fg': '#D1D3D9', // GotItTooltip.foreground
    '--gotit-link': '#92B7FF', // GotItTooltip.linkForeground
    '--gotit-step': '#8B8E94', // GotItTooltip.stepForeground
    '--gotit-shortcut-bg': '#233558', // GotItTooltip.shortcutBackground
    '--gotit-button-border': '#FFFFFF3B', // GotItTooltip.Button.startBorderColor
    '--gotit-button-contrast': '#233558', // GotItTooltip.Button.contrastBackground
    '--unused-fg': '#6F737A', // scheme NOT_USED_ELEMENT_ATTRIBUTES
    '--console-fg': '#BCBEC4',
    '--console-error': '#F75464',
    '--console-system': '#BCBEC4',
    '--console-link': '#548AF7',
    '--input-bg': '#191A1C', // TextField.background
    '--project-gradient': '#335661', // RecentProject.Color4.MainToolbarGradientStart
    '--avatar-start': '#3B92B8',
    '--avatar-end': '#6183EC',
    '--scrollbar-thumb': '#FFFFFF26',
    '--scrollbar-thumb-hover': '#FFFFFF40',
    '--shadow': '0 8px 24px rgba(0,0,0,.45)',
  },
}

export const islandsLight: UiTheme = {
  id: 'islands-light',
  name: 'Islands Light',
  dark: false,
  vars: {
    '--main-bg': '#E9EAEE',
    '--island-bg': '#FFFFFF',
    '--fg': '#000000',
    '--fg-muted': '#5F6269',
    '--fg-secondary': '#73767C',
    '--fg-disabled': '#9FA2A8',
    '--hover-bg': '#00000012',
    '--pressed-bg': '#00000020',
    '--tree-hover-bg': '#00000008',
    '--selection-bg': '#D0DFFE',
    '--selection-inactive-bg': '#E9EAEE',
    '--separator': '#00000020',
    '--border': '#D1D3D9',
    '--component-border': '#D1D3D9',
    '--accent': '#3871E1',
    '--accent-fg': '#FFFFFF',
    '--link': '#2F5EB9',
    '--popup-bg': '#FFFFFF',
    '--tooltip-bg': '#FFFFFF',
    '--tab-selected-bg': '#E3EBFE',
    '--tab-selected-border': '#A7C5FF',
    '--tab-inactive-selected-bg': '#E9EAEE',
    '--tab-inactive-selected-border': '#D1D3D9',
    '--error': '#C54E58',
    '--warning': '#A56906',
    '--success': '#338555',
    '--run-green': '#208A3C',
    '--run-running-bg': '#338555',
    '--stop-bg': '#C54E58',
    '--editor-fg': '#080808',
    '--wrong-ref': '#F50000', // scheme WRONG_REFERENCES_ATTRIBUTES (expUI_lightScheme.xml)
    '--gotit-bg': '#FFFFFF',
    '--gotit-border': '#D1D3D9',
    '--gotit-fg': '#000000',
    '--gotit-link': '#2F5EB9',
    '--gotit-step': '#8B8E94',
    '--gotit-shortcut-bg': '#DDDFE4',
    '--gotit-button-border': '#00000030',
    '--gotit-button-contrast': '#3871E1',
    '--unused-fg': '#808080', // scheme NOT_USED_ELEMENT_ATTRIBUTES (Default)
    '--console-fg': '#080808',
    '--console-error': '#E55230',
    '--console-system': '#080808',
    '--console-link': '#2A5FD6',
    '--input-bg': '#FFFFFF',
    '--project-gradient': '#CBE4F7',
    '--avatar-start': '#3B92B8',
    '--avatar-end': '#6183EC',
    '--scrollbar-thumb': '#00000026',
    '--scrollbar-thumb-hover': '#00000040',
    '--shadow': '0 8px 24px rgba(0,0,0,.18)',
  },
}

export const uiThemes: Record<ThemeId, UiTheme> = {
  'islands-dark': islandsDark,
  'islands-light': islandsLight,
}

export function applyUiTheme(theme: UiTheme) {
  const root = document.documentElement
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v)
  root.dataset.theme = theme.dark ? 'dark' : 'light'
  root.style.colorScheme = theme.dark ? 'dark' : 'light'
}
