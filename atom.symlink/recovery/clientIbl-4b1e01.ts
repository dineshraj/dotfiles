const IBL_BASE_URL = 'https://ibl.api.bbci.co.uk/ibl/v1';
const fetchOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
};

function constructUrl(endpointUrl: string, params: object): string {
  const url = new URL(endpointUrl);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  return url.href;
}

async function getEpisodes(pid: string): Promise<Array<object>> {
  const queryParams = {
    rights: 'web',
    availability: 'available',
    mixin: 'live'
  };

  const endpointUrl = `${IBL_BASE_URL}/episodes/${pid}`;
  const url = constructUrl(endpointUrl, queryParams);

  try {
    const response = await fetch(url, fetchOptions);
    const json = await response.json();

    return json.episodes;
  } catch(err) {
    throw new Error(err);
  }
};

async function getProgrammeEpisodes(pid: string): Promise<Array<object>> {
  const queryParams = {
    rights: 'web',
    availability: 'available',
    per_page: 4
  };

  const endpointUrl = `${IBL_BASE_URL}/programmes/${pid}/episodes`;
  const url = constructUrl(endpointUrl, queryParams);

  try {
    const response = await fetch(url, fetchOptions);
    console.log('response.json', response.json());

    response.json().then((json2) => {
      console.log('json2', json2);
    }).catch((err) => {
      console.log('json2 err', err);
    })

    const json = await response.json();


    return json['programme_episodes'];
  } catch(err) {
    console.log('ERR', err);
    throw new Error(err);
  }
}

export default { getEpisodes, getProgrammeEpisodes };
