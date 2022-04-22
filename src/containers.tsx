import './containers.scss'

export function VStack(props: { children?: any, classes?: string[] } = {}) {
  return <div class={['vstack'].concat(props.classes ?? []).join(' ')}>{props.children}</div>;
}
export function VScroll(props: { children?: any, classes?: string[] } = {}) {
  return <div class={['vscroll'].concat(props.classes ?? []).join(' ')}>{props.children}</div>;
}
