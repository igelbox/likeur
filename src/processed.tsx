import { Component } from 'preact';
import { VScroll } from './containers';
import { logger } from './log';
import * as modal from './modal';
import { IStore } from './storage';
import { Table } from './table';
import { autocatch } from './utils';
import './processed.scss'

export type Processed = {
  pk: number;
  username?: string;
  likepass: 'like' | 'pass',
  cause?: string;
  updated?: number;
};

class Processeds extends Component<{
  store: () => IStore<Processed>;
}, {
  loading: boolean;
  processeds: Array<Processed>;
}> {
  constructor() {
    super();
    this.state = {
      loading: true,
      processeds: [],
    };
  }

  @autocatch(logger)
  async componentDidMount() {
    const processeds = await this.props.store().getAll();
    this.setState({
      ...this.state,
      loading: false,
      processeds,
    });
  }

  render() {
    const { processeds, loading } = this.state;
    const self = this;
    return [
      <VScroll classes={['processed', ...loading ? ['loading'] : []]}>
        <Table
          data={processeds}
          columns={[{
            title: 'Username',
            render: (item) => item.username ? <a href={`https://www.instagram.com/${item.username}/`}>@{item.username}</a> : String(item.pk),
          }, {
            title: 'Cause',
            class: 'align-center',
            render: (item) => item.cause,
          }, {
            title: 'Time (ago)',
            class: 'align-right',
            render(item) {
              return item.updated ? `${((Date.now() - item.updated) / 1000 / 60 / 60).toFixed(1)}h` : undefined;
            }
          }]}
          rowclass={(item) => item.likepass}
          comparator={(a, b) => (b.updated ?? 0) - (a.updated ?? 0)}
        />
      </VScroll>,
    ];
  }
}

export async function show(store: () => IStore<Processed>) {
  modal.show({
    title: 'Processed',
    body: [<Processeds store={store} />],
  });
}
