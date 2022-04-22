import { Component } from 'preact'
import './log.scss'
import './containers.scss'

function format(value: unknown): string {
  if (typeof value == 'object') {
    const json = JSON.stringify(value);
    if (value && value.constructor) {
      return `${value.constructor.name}(${json})`;
    }
    return json;
  }

  return String(value);
}

const views = Array<HTMLDivElement>();
function makeLevel(level: string, prefix: string[]) {
  const pfx = '.' + prefix.join('.');
  return (...args: unknown[]) => {
    const time = (new Date()).toISOString().replace(/T/, ' ');
    const text = args.map(format)
      .join(' ');
    (console as any)[level](pfx, ...args);
    for (const view of views) {
      const line = document.createElement('div');
      line.className = level;
      line.innerText = `${time} ${level} ${pfx} ${text}`;
      view.prepend(line);
    }
  };
}
function makeLogger(prefix: string[]) {
  return {
    debug: makeLevel('debug', prefix),
    info: makeLevel('info', prefix),
    warn: makeLevel('warn', prefix),
    error: makeLevel('error', prefix),
    subLogger(name: string) {
      return makeLogger(prefix.concat([name]));
    }
  };
}
export const logger = makeLogger([]);
export const subLogger = logger.subLogger;

export class Log extends Component<{
  classNames?: string[];
  onMount?: () => void;
}> {
  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    const { onMount } = this.props;
    onMount && onMount();
  }

  render() {
    return <div
      class={['log', 'borders'].concat(this.props.classNames ?? []).join(' ')}
      ref={(self) => self && views.push(self)}
    ></div>
  }
}
