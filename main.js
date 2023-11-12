const https = require('https');
const cheerio = require('cheerio');
const { contains } = require('cheerio');

//AWS SES Config
//load the AWS SDK
const AWS = require('aws-sdk');
//sender email
const sender = "Ratings Update <ratings.update@gmail.com>";
//recipient
const recipient = "veggieman999@gmail.com";
//subject line
const subject = "Omnipong Event Openings";
//email body for recipients for non-HTML email clients
const body_text = "omnipong-listener has found an event with an opening";
//html body
const body_html = `<html>
<head></head>
<body>
<h1>Omnipong-Listener has found an event that has an opening</h1>
<p>Email sent with Amazon SES using the AWS SDK for JavaScript in Node.js</p>
</body>
</html>`;
//character encoding for the email
const charset = "UTF-8";
//create a new SES object
var ses = new AWS.SES();
//specify the params to pass to the API
var emailParams = {
	Source: sender,
	Destination: {
		ToAddresses: [
		recipient
		],
	},
	Message: {
		Subject: {
			Data: subject,
			Charset: charset
		},
		Body: {
			Text: {
				Data: body_text,
				Charset: charset
			},
			Html: {
				Data: body_html,
				Charset: charset
			}
		}
	}
};
//end AWS SES config

var omnipongMdttcJuneOpenURL = 'https://omnipong.com/T-tourney.asp?t=102&r=2863&h=';

//text in the <th> to specify which event to listen for new slots in
var eventText = 'Open Doubles RR'; //TODO: change back to 2400

//what we need to do is find the table from the html source that contains 'eventText', which is:
//table class=omnipong > tbody > tr > th > contains:eventText

//once we have that table, we need the last <tr> in that table, and the first <th> containing the text "Remaining slots: <num>"
var entriesRemainingText = "Remaining slots: ";

function checkAndNotify() {
	https.get(omnipongMdttcJuneOpenURL, (resp) => {
		let data = '';

	//a chunk of data has been received
	resp.on('data', (chunk) => {
		data += chunk;
	});

	//received the whole response
	resp.on('end', () => {
		//console.log("data:");
		//console.log(data);
		//pass the HTML document into cheerio so we can parse it
		const $ = cheerio.load(data);

		//get the html of the entries table that contains "Under 2400 RR".
		var under2400EventTable = $('table[class=omnipong]:contains("' + eventText + '")').html();

		//from there, get the substring that starts with "Remaining slots: ".
		//console.log(under2400EventTable);
		//console.log(under2400EventTable.indexOf(entriesRemainingText));
		var entriesRemainingIndex = under2400EventTable.indexOf(entriesRemainingText);
		var stringStartingWithEntriesRemaining = under2400EventTable.substring(entriesRemainingIndex);
		//console.log(stringStartingWithEntriesRemaining);

		//then, get the first index of "</th>"
		var endIndex = stringStartingWithEntriesRemaining.indexOf("</th>");
		
		//the moneymaker
		var remainingSlots = stringStartingWithEntriesRemaining.substring(entriesRemainingText.length,endIndex);
		//console.log(remainingSlots);
		var remainingSlotsInt = parseInt(remainingSlots);
		console.log(remainingSlotsInt);
		console.log(remainingSlotsInt===0);

		if (remainingSlotsInt!==0) {
			console.log("there are slots remaining! remaining slots: " + remainingSlotsInt);
			//send the email
			ses.sendEmail(emailParams, function(err, data) {
				if(err) {
					console.log("error sending email: "+ err.message);
				} else {
					console.log("email sent! message ID: " + data.messageId);
				}
			});
		}
	});

}).on("error", (err) => {
	console.log("Error: " + err.message);
});
}//end func checkAndNotify

//checkAndNotify();
exports.checkAndNotify = checkAndNotify;
