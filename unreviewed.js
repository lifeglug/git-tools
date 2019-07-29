#!/usr/bin/env node

const OAUTH_TOKEN = process.env.OAUTH_TOKEN;
const REPO = process.argv.slice(2)[0];

if (!OAUTH_TOKEN) {
  console.error('No OAUTH_TOKEN env var set, aborting.');
  process.exit(1);
}

if (!REPO) {
  console.error('No REPO argument provided, aborting.');
  process.exit(1);
}

const Octokit = require('@octokit/rest');

const client = Octokit({
  auth: `token ${OAUTH_TOKEN}`,
});

const parse = (data) => {
  const logins = data.items.reduce((memo, datum) => {
    const name = datum.user.login;
    if (!memo.hasOwnProperty(name)) {
      memo[name] = 0;
    }
    memo[name] += 1;
    return memo;
  }, {});

  const sorted = Object.keys(logins)
    .reduce((memo, key) => {
      memo.push([logins[key], key]);
      return memo;
    }, [])
    .sort((a, b) => {
      return b[0] > a[0];
    });

  return {
    total: data.total_count,
    culprits: sorted,
  };
};

const render = ({ total, culprits }) => {
  console.log(`--- ${total} PRs found to be merged without review in the "${REPO}" repository ---`);
  culprits.map((culprit) => {
    console.log(`${culprit[0]} - ${culprit[1]}`);
  });
  console.log(`--- END ---`);
};

(async () => {
  await client.search
    .issuesAndPullRequests({
      q: `is:pr+review:none+is:merged+repo:${REPO}`,
      per_page: 100,
    })
    .then(({ data }) => parse(data))
    .then(render);
})();
