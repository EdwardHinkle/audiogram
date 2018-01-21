
var request = require('request'),
    queue = require("d3").queue,
    fs = require("fs"),
    rimraf = require("rimraf"),
	gentleBaseURL = "http://localhost:8765",
	gentlePoll;

// FIXME: todo
function fetchTranscript(job, cb) {
	var requestURL = gentleBaseURL + '/transcriptions/' + job + '/align.json';
	request(requestURL, function (error, response, body) {
		cb(error,body);
	});
}

function fetch(job, cb) {
	if (!gentlePoll.error && gentlePoll.status=="OK") {
		var q = queue(2);
		q.defer(fetchTranscript,job)
		 .await(function(error,transcript){
		 	cb(error,{transcript: transcript});
	 	});
	} else {
		cb(null,null);
	}
}

function poll(job, cb) {
	var requestURL = gentleBaseURL + '/transcriptions/' + job + '/status.json';
	request(requestURL, function (error, response, body) {
		var bodyJson = JSON.parse(body);
		gentlePoll = {status: bodyJson.status, error: (error || bodyJson.error)}
		cb(error);
	});
}

function get(req, res) {
	var q = queue(1),
		job = req.params.job,
		transcript = null;
	q.defer(poll,job)
	 .defer(fetch,job)
	 .await(function(error,_,result){
		return 	res.json({
					job: job,
					status: gentlePoll.status,
					error: error || gentlePoll.error,
					transcript: result ? result.transcript : null,
				});
	 });
}

function post(req, res) {
	var formData = {
		audio: fs.createReadStream(req.files['audio'][0].path),
    transcript: req.body.transcript
	};
	request.post({url: gentleBaseURL + '/transcriptions', formData: formData}, function (error, response, body) {
		rimraf(req.files['audio'][0].destination, function(err){
			console.log("Error deleting tmp dir: " + err);
		})
    if (response.statusCode == 302) {
      var jobid = response.headers.location.split('/')[2];
      return res.json({job: jobid, error: error});
		} else {
			return res.status(500).send("Error parsing Gentle response.");
		}
	});
}


module.exports = {
  get: get,
  post: post
};
