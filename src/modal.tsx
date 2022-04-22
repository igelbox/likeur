import { Component, JSX, render } from 'preact';
import { logger } from './log';
import { wrapAsync } from './utils';
import './modal.scss';

// class Modal extends Component {

// }

export async function show(props: {
  body: JSX.Element[];
  title: string;
  onCancel?: () => Promise<boolean>;
  onApply?: () => Promise<boolean>;
}) {
  const modal = document.createElement('div');
  const onKeyDown = wrapAsync(async (event: KeyboardEvent) => {
    if (event.key == 'Escape') {
      await close();
    }
  }, logger);
  window.addEventListener('keydown', onKeyDown);
  modal.className = 'modal-container';
  document.body.appendChild(modal);
  render(<div class='modal vstack'>
    <div class='header borders'>
      <span class='title'>{props.title}</span>
      {props.onApply ? <button class='apply' onClick={wrapAsync(ok, logger)}>v</button> : undefined}
      <button class='close' title='Close Dialog' onClick={wrapAsync(close, logger)}>X</button>
    </div>
    {props.body}
  </div>, modal);
  async function ok() {
    await props.onApply!();
    modal.parentNode?.removeChild(modal);
  }
  async function close() {
    if (props.onCancel && !await props.onCancel()) {
      return;
    }
    modal.parentNode?.removeChild(modal);
    window.removeEventListener('keydown', onKeyDown);
  }
}
