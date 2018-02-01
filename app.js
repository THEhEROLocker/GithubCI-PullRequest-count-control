const octokit = require('@octokit/rest')({
      debug: true
});
const express = require('express');
var bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });

const MIN_REQUIRED_APPROVES = 3; //Change this as per your requirement
const secret = 'YOUR_GITHUB_SECRET_KEY_FOR_WEBHOOK';

octokit.authenticate({
      type: 'oauth',
      token: 'YOUR_GITHUB_API_TOKEN'
});

function verifySignature(req, res, next) {
      let myCreatedHash = "sha1="+ crypto.createHmac('sha1', secret).update(JSON.stringify(req.body)).digest('hex');
      let githubHash = req.headers['x-hub-signature'];
      if(myCreatedHash=== githubHash && crypto.timingSafeEqual(Buffer.from(myCreatedHash,"utf-8"),Buffer.from(githubHash,"utf-8"))){
            next();
      }
      else{
            res.status(500).send("You can't fool me");
      }
}

app.post('/event_handler', jsonParser, verifySignature, function (req, res) {
      if (req.headers['x-github-event'] === 'pull_request' || req.headers['x-github-event'] === 'pull_request_review') {
            console.log(req.body.pull_request.id);

            octokit.pullRequests.getReviews({
                  owner: req.body.pull_request.head.repo.owner.login,
                  repo: req.body.pull_request.head.repo.name,
                  number: req.body.pull_request.number
            })
            .then(function (pullReqResponse) {
                  let countOccurencesApproved = countNumberOfApproves(pullReqResponse.data);
                  
                  let Status;
                  let Description;
                  
                  if (countOccurencesApproved >= MIN_REQUIRED_APPROVES) {
                        Status = "success";
                        Description = "Ready for Merge";
                  }
                  else {
                        Status = "failure";
                        Description = "The number of approves are " + countOccurencesApproved + " Need "+ MIN_REQUIRED_APPROVES;
                  }

                  octokit.repos.createStatus({
                        owner: req.body.pull_request.head.repo.owner.login,
                        repo: req.body.pull_request.head.repo.name,
                        sha: req.body.pull_request.head.sha,
                        state: Status,
                        description: Description,
                        context: "My Personal CI Server"
                  }).then(() => res.send(Status))
            })
      }
})

function countNumberOfApproves(pullRequestReviews){
    let finalStatusOfApproval = {};
    let countApproved = 0;

    pullRequestReviews.forEach(function(element) {
        if(element.state === "APPROVED"){
            finalStatusOfApproval[element.user.id] = 1;
        }
        else if(element.state === "CHANGES_REQUESTED" || element.status === "DISMISSED"){
            finalStatusOfApproval[element.user.id] = 0;
        }
        else{
            finalStatusOfApproval[element.user.id] = 0;
        }
    }, this);

    Object.keys(finalStatusOfApproval).forEach(function(key){
        countApproved += finalStatusOfApproval[key];
    });

    return countApproved;
}

app.listen(4567, () => console.log('Server listening on port 4567!'));