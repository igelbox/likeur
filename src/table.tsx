import { JSX } from 'preact';
import './table.scss'

export function Table<T>(props: {
  columns: Array<{
    title?: string;
    class?: string;
    render(item: T): string | undefined | JSX.Element;
  }>;
  data: T[];
  comparator?(a: T, b: T): number;
  rowclass?(item: T): string | undefined;
}) {
  const data = props.data.slice();
  if (props.comparator) {
    data.sort(props.comparator);
  }
  return <table>
    <thead>
      <tr>{props.columns.map((c, i) => <th key={i} class={c.class}>{c.title ?? ''}</th>)}</tr>
    </thead>
    <tbody>
      {data.map((item, i) => <tr key={i} class={props.rowclass && props.rowclass(item)}>
        {props.columns.map((c, i) => <td key={i} class={c.class}>{c.render(item)}</td>)}
      </tr>)}
    </tbody>
  </table>;
}
