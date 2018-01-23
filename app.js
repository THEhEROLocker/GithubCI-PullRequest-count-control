const octokit = require('@octokit/rest')({
      debug: true
})
const express = require('express')
var bodyParser = require('body-parser')
const app = express()

var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })

octokit.authenticate({
      type: 'oauth',
      token: 'bbdf5df64b579835ff045fd313e3ff27fb8d01be'
})

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/event_handler', jsonParser, function (req, res) {
      if (req.headers['x-github-event'] === 'pull_request') {
            console.log(req.body.pull_request.id);

            octokit.pullRequests.getReviews({
                  owner: req.body.pull_request.repo.owner.login,
                  repo: req.body.pull_request.repo.name,
                  number: req.body.pull_request.number
            })
            .then(function (pullReqResponse) {
                  var data = JSON.stringify(pullReqResponse.data);
                  var countOccurencesApproved = (data.length - data.replace(/APPROVED/g,"").length) / "APPROVED".length;
                  if (countOccurencesApproved === 1) {
                        octokit.repos.createStatus({
                              owner: req.body.pull_request.repo.owner.login,
                              repo: req.body.pull_request.repo.name,
                              sha: req.body.pull_request.head.sha,
                              state: 'success',
                              description: "Ready for Merge",
                              context: "Rohan Elukurthy CI Server"
                        }).then(() => res.send("success"))
                  }
                  else {
                        octokit.repos.createStatus({
                              owner: req.body.pull_request.repo.owner.login,
                              repo: req.body.pull_request.repo.name,
                              sha: req.body.pull_request.head.sha,
                              state: 'failure',
                              description: "The number of approves are only "+ countOccurencesApproved + " Need three to merge",
                              context: "Rohan Elukurthy CI Server"
                        }).then(() => res.send("The number of approves are only "+ countOccurencesApproved + " Need three to merge"))
                  }
            })
      }
})

app.listen(4567, () => console.log('Example app listening on port 4567!'))



