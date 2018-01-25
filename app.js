const octokit = require('@octokit/rest')({
      debug: true
});
const express = require('express');
var bodyParser = require('body-parser');

const app = express();
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });

const MIN_REQUIRED_APPROVES = 3;

octokit.authenticate({
      type: 'oauth',
      token: 'YOUR_GITHUB_API_TOKEN'
});

app.post('/event_handler', jsonParser, function (req, res) {
      if (req.headers['x-github-event'] === 'pull_request' || req.headers['x-github-event'] === 'pull_request_review') {
            console.log(req.body.pull_request.id);

            octokit.pullRequests.getReviews({
                  owner: req.body.pull_request.repo.owner.login,
                  repo: req.body.pull_request.repo.name,
                  number: req.body.pull_request.number
            })
            .then(function (pullReqResponse) {
                  let data = JSON.stringify(pullReqResponse.data);
                  let countOccurencesApproved = (data.length - data.replace(/APPROVED/g, "").length) / "APPROVED".length;
                  
                  let Status;
                  let Description;
                  
                  if (countOccurencesApproved === MIN_REQUIRED_APPROVES) {
                        Status = "success";
                        Description = "Ready for Merge";
                  }
                  else {
                        Status = "failure";
                        Description = "The number of approves are only " + countOccurencesApproved + " Need "+ MIN_REQUIRED_APPROVES +" to merge";
                  }

                  octokit.repos.createStatus({
                        owner: req.body.pull_request.repo.owner.login,
                        repo: req.body.pull_request.repo.name,
                        sha: req.body.pull_request.head.sha,
                        state: Status,
                        description: Description,
                        context: "My Personal CI Server"
                  }).then(() => res.send(Status))
            })
      }
})

app.listen(4567, () => console.log('Server listening on port 4567!'));