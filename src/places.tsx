import { Component } from 'preact';
import { VScroll } from './containers';
import { logger } from './log';
import * as modal from './modal';
import { IStore } from './storage';
import { Table } from './table';
import { autocatch, wrapAsync } from './utils';
import './places.scss'

export type Place = {
  pk: number;
  title: string;
  updated?: number;
  info?: unknown;
};

const comparator = (a: Place, b: Place) => (a.updated ?? 0) - (b.updated ?? 0);

type Proxy = <T>(url: string, query?: Record<string, unknown>) => Promise<T>;
class Places extends Component<{
  store: () => IStore<Place>;
  proxy: Proxy;
  onPlaces?: (places: Place[]) => void;
}, {
  loading: boolean;
  places: Array<Place>;
  statuses: Record<number, 'fetching' | 'error' | 'done'>;
}> {
  constructor() {
    super();
    this.state = {
      loading: true,
      places: [],
      statuses: {},
    };
  }

  @autocatch(logger)
  async componentDidMount() {
    const places = await this.props.store().getAll();
    this.props.onPlaces && this.props.onPlaces(places);
    this.setState({
      ...this.state,
      loading: false,
      places,
    });
  }

  render() {
    const { onPlaces: onUpdate, store, proxy } = this.props;
    const { places, statuses, loading } = this.state;
    const self = this;
    return [
      <VScroll classes={['places', ...loading ? ['loading'] : []]}>
        <Table
          data={places}
          comparator={comparator}
          columns={[{
            title: 'PK',
            class: 'pk',
            render: (item) => String(item.pk),
          }, {
            title: 'Place',
            class: 'title',
            render: (item) => item.title,
          }, {
            title: 'Updated',
            class: 'updated',
            render(item) {
              let text = item.updated ? `${((Date.now() - item.updated) / 1000 / 60 / 60).toFixed(1)}h` : '??';
              const status = statuses[item.pk];
              if (status === 'error') {
                text = 'E! ' + text;
              }
              if (status === 'fetching') {
                text = 'loading';
              }
              return <button title='Fetch posts' class={status} onClick={wrapAsync(() => update(item), logger)}>{text}</button>;
            }
          }, {
            class: 'actions',
            render(item) {
              return <button title='Delete Place' onClick={wrapAsync(async () => {
                if (!confirm(`Delete ${item.title}?`)) {
                  return;
                }
                await store().delete(item.pk);
                self.setState({
                  ...self.state,
                  places: places.filter(p => p != item),
                });
                onUpdate && onUpdate(self.state.places);
              }, logger)}>X</button>;
            }
          }]}
        />
      </VScroll>,
      <div class='buttons'>
        <button class='add' onClick={wrapAsync(async () => {
          const lines = prompt('PK Title');
          if (!lines) {
            return;
          }
          for (const line of lines.split('\n')) {
            if (!line) {
              continue;
            }
            const [pk, ...title] = line.split(/[ \t]/);
            const place: Place = {
              pk: Number(pk),
              title: title.join(' ').trim(),
            };
            await store().put(place);
            self.setState({
              ...self.state,
              places: [place, ...self.state.places],
            });
          }
          onUpdate && onUpdate(self.state.places);
        }, logger)}>Add Place</button>
        <button class='add' onClick={wrapAsync(async () => {
          if (!confirm('This may take a while. Proceed?')) {
            return;
          }
          for (const place of places.slice().sort(comparator)) {
            await update(place);
          }
        }, logger)}>Update All</button>
      </div>,
    ];
    async function update(item: Place) {
      self.setState({
        ...self.state,
        statuses: { ...statuses, [item.pk]: 'fetching' },
      });
      try {
        const now = Date.now();
        const info = await proxy(`https://www.instagram.com/explore/locations/${item.pk}/`, { __a: 1 });
        item.info = info;
        item.updated = now;
        store().put(item);
      } catch (e) {
        self.setState({
          ...self.state,
          statuses: { ...statuses, [item.pk]: 'error' },
        });
        throw e;
      }
      self.setState({
        ...self.state,
        statuses: { ...statuses, [item.pk]: 'done' },
      });
    }
  }
}

export async function show(store: () => IStore<Place>, proxy: Proxy, onPlaces?: (places: Place[]) => void) {
  modal.show({
    title: 'Places',
    body: [<Places store={store} proxy={proxy} onPlaces={onPlaces} />],
  });
}
