import { Component } from 'preact';
import { VScroll, VStack } from './containers';
import { subLogger } from './log';
import { Place } from './places';
import { autocatch, wrapAsync } from './utils';
import { IStore } from './storage';
import { Processed } from './processed';
import './posts.scss'

const logger = subLogger('posts');

export class Posts extends Component<{
  places: Array<Place>;
  processed: () => IStore<Processed>;
}, {
  maxLikes: number;
  processed: Record<number, Processed>;
  posts: Array<Post>;
}> {
  constructor() {
    super();
    this.state = {
      maxLikes: 100,
      processed: {},
      posts: [],
    };
  }


  @autocatch(logger)
  async componentDidMount() {
    const processed = { ...this.state.processed };
    for (const p of await this.props.processed().getAll()) {
      processed[p.pk] = p;
    }
    this.setState({
      ...this.state,
      processed,
      posts: preparePosts(this.props.places, processed)
    });
  }

  render() {
    const { maxLikes, processed } = this.state;
    const self = this;
    const posts = this.state.posts.filter(p => p.likes < maxLikes)
      .slice(0, 36);
    return [
      <label>{'Likes <= '}
        <input type='number' value={maxLikes} onChange={(event) => {
          self.setState({ maxLikes: Number(event.currentTarget.value) });
        }}></input></label>,
      <VScroll classes={['posts', 'borders']}>
        {posts.map(p => {
          const proc = processed[p.user.pk];
          return <VStack key={p.pk} classes={['borders']}>
            <div class='title'>
              <span class='name' title={p.user.full_name}>{p.user.full_name}</span>
              <button class={proclass('like', proc)} onClick={wrapAsync(() => score(p, 'like'), logger)}>♥{p.likes}</button>
            </div>
            <div class='buttons'>
              {['man', 'firm', 'kids', 'pair', 'old', 'fat', 'far', 'bad'].
                map(c => <button class={proclass(c, proc)} onClick={wrapAsync(() => score(p, 'pass', c), logger)}>{c}</button>)}
            </div>
            <a href={`https://www.instagram.com/p/${p.code}/`} target='blank'>
              <img src={p.url} crossOrigin='anonymous' />
            </a>
          </VStack>;
          function proclass(cause: string, proc?: Processed) {
            return (cause === 'like' && (proc?.likepass === 'like')) || (proc?.cause === cause) ? 'pressed' : undefined;
          }
        })}
      </VScroll>
    ];

    async function score(post: Post, likepass: 'like' | 'pass', cause?: string) {
      const pk = post.user.pk;
      const p: Processed = {
        pk,
        username: post.user.username,
        likepass,
        cause,
        updated: Date.now(),
      };
      self.setState({
        processed: { ...self.state.processed, [pk]: p }
      });
      await self.props.processed().put(p);
    }
  }
}

type Post = {
  pk: number;
  code: string;
  url: string;
  user: {
    pk: number;
    username: string;
    full_name: string;
  };
  likes: number;
}
function preparePosts(places: Place[], processed: Record<number, Processed>) {
  const unique = new Set<number>();
  const result = Array<Post>();
  for (const place of places) {
    for (const r of ['recent', 'ranked']) {
      if (!place.info) {
        continue;
      }
      const rr = (place.info as any).native_location_data[r];
      if (!rr)
        continue
      for (const s of rr.sections) {
        for (const m of s.layout_content.medias) {
          const media = m.media;

          const { like_count } = media;
          // if (like_count > maxLikes) {
          //   logger.debug('skip: lc:', like_count);
          //   continue;
          // }

          // const { taken_at } = media
          // const dt = now - taken_at
          // if (dt > 60 * 60 * 24 * 62) {
          //   log.debug('skip: dt:', dt)
          //   continue
          // }

          const { user } = media;
          if (processed[user.pk]) {
            continue;
          }
          if (unique.has(media.user.pk)) {
            logger.debug('skip', media.user.username);
            continue;
          }
          unique.add(media.user.pk);
          const image_versions2 = media.image_versions2 || media.carousel_media[0].image_versions2;
          const { candidates } = image_versions2;
          candidates.sort((a: any, b: any) => a.width - b.width);
          let url = undefined;
          for (const c of candidates) {
            if (!url || (c.width <= 320)) {
              url = c.url;
            }
          }

          result.push({
            pk: media.pk,
            code: media.code,
            url,
            user,
            likes: like_count,
          });
        }
      }
    }
  }
  return result;
}
