import 'regenerator-runtime/runtime'
import { Component, JSX, render } from 'preact';
import { VStack } from './containers';
import { Log, logger } from './log';
import * as storage from './storage';
import * as settings from './settings';
import { autocatch, wrapAsync } from './utils';
import * as places from './places';
import * as processed from './processed';
import * as proxy from './proxy';
import { Posts } from './posts';
import './index.scss';

export class Application extends Component<{
}, {
  buttons: Array<JSX.Element>;
  db: storage.IStorage;
  proxy: ReturnType<typeof proxy.create>;
  places: Array<places.Place>;
}> {
  constructor() {
    super();
    // this.state = {
    //   places: [],
    // };
  }
  @autocatch(logger)
  async componentDidMount() {
    const db = await storage.open();
    const { ask, process, settings: ss } = await settings.crate(db.settings, prompt);
    const places = await db.places<places.Place>().getAll();
    this.setState({
      db,
      proxy: proxy.create(ss),
      places,
      buttons: Object.entries(settings.SCHEMA)
        .map(([k, s]) => <button key={k} onClick={wrapAsync(() => ask(k), logger)}>Set {s.name}</button>),
    });
    await process();
    logger.info('ready');
  }

  render() {
    const { db, buttons, proxy } = this.state;
    return <VStack>
      <div class='toolbar'>
        {buttons}
        |{db ? <button onClick={wrapAsync(() => places.show(db.places, proxy, (pp) => {
          this.setState({ ...this.state, places: pp });
        }), logger)}>Show Places</button> : undefined}
        |{db ? <button onClick={wrapAsync(() => processed.show(db.processed), logger)}>Show Processed</button> : undefined}
        |{db ? <button onClick={wrapAsync(async () => navigator.clipboard.writeText(JSON.stringify(await db.settings().export())), logger)}>Export</button> : undefined}
        |{db ? <button onClick={wrapAsync(async () => {
          const dump = prompt('Overwrite the config');
          if (!dump) {
            return;
          }
          await db.settings().import(JSON.parse(dump));
        }, logger)}>Import</button> : undefined}
        <div class='right'>
          <a href='https://github.com/igelbox/likeur/blob/master/README.md' target='blank'>ReadMe</a>
        </div>
      </div>
      {db && <Posts
        places={this.state.places ?? []}
        processed={db.processed}
      />}
      <Log />
    </VStack>
  }
}

document.body.onload = () => {
  render(<Application />, document.body);
};
