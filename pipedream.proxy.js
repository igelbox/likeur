const axios = require('axios')
axios.interceptors.response.use((response) => response, (error) => error);
const headers = event.headers;
for (const h of ['host', 'cookie']) {
  const v = headers['x-' + h];
  if (v) {
    headers[h] = v;
    delete headers['x-' + h];
  }
}
const resp = await axios({
  method: event.method,
  url: event.query.url,
  headers,
  body: event.body,
});
const rresp = {
  immediate: true,
  status: resp.status,
  headers: resp.headers,
  body: resp.body || resp.data,
};
await $respond(rresp);
