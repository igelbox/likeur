import { subLogger } from './log';
import { FStore } from './storage';
import { wrapAsync } from './utils';

const logger = subLogger('export');

export function ExportToClipboard(props: {
  store: FStore<unknown>;
}) {
  return <button onClick={wrapAsync(async () => {
    const data = await props.store().export();
    const json = JSON.stringify(data);
    await navigator.clipboard.writeText(json);
  }, logger)}>Export</button>
}
