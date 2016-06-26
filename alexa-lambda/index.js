"use strict";
/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 *
 * Examples:
 * One-shot model:
 *  User: "Alexa, ask Good News Bad News for good news"
 *  Alexa: "Here are today's good news: ..."
 */

/**
 * App ID for the skill
 */
var APP_ID = "amzn1.echo-sdk-ams.app.4f540de1-1471-413d-8e12-2dfd2dcdaa1b",
    NEWS_TYPE = {GOOD: 1, BAD: 2},
    GOOD_NEWS_SOURCE = "https://s3.amazonaws.com/good-news-bad-news/good-news.json",
    BAD_NEWS_SOURCE = "https://s3.amazonaws.com/good-news-bad-news/bad-news.json";

var AlexaSkill = require('./AlexaSkill');
var https = require('https');

/**
 * SpaceGeek is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var News = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
News.prototype = Object.create(AlexaSkill.prototype);
News.prototype.constructor = News;

News.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

News.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    //console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleNewsRequest(response);
};

/**
 * Overridden to show that a subclass can override this function to teardown session state.
 */
News.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

News.prototype.intentHandlers = {
    "GetGoodNewsIntent": function (intent, session, response) {
        handleNewsRequest(response, NEWS_TYPE.GOOD);
    },
    "GetBadNewsIntent": function (intent, session, response) {
        handleNewsRequest(response, NEWS_TYPE.BAD);
    },
    "GetDayIntent": function (intent, session, response) {
        handleGetDay(response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can say tell me the good news, you can say tell me" +
                     "the bad news, or you can say how is the day ... What can I" +
                     "help you with?", "What can I help you with?");
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

/**
 * Gets an idea of the type of day going on (good vs bad)
 */
function handleGetDay(response) {
  // Create speech output
  getNewsJson(NEWS_TYPE.GOOD, function(goodNewsJson) {
    getNewsJson(NEWS_TYPE.BAD, function(badNewsJson) {
      var goodCount = goodNewsJson.length;
      var badCount = badNewsJson.length;
      var daySentiment = goodCount >= badCount ? 'good' : 'bad';
      var speechOutput = "Today was a " + daySentiment + " day, with " + goodCount + " good news and " + badCount + " bad news. Do you want the good or the bad news first?",
          cardTitle = "Today's Good and Bad News";
      response.askWithCard(speechOutput, cardTitle, speechOutput);
    });
  });
}

/**
 * Gets a random new fact from the list and returns to the user.
 */
function handleNewsRequest(response, newsType) {
  // respond with news based on type (good or bad)

  var speech_type = newsType == NEWS_TYPE.GOOD ? "good" : "bad";

  // Create speech output
  getNewsJson(newsType, function(newsJson) {
    var newsBody = buildNews(newsJson);
    var speechOutput = "Here's are today's " + speech_type + " news:\n" + newsBody;
    var cardTitle = "Your News";
    response.tellWithCard(speechOutput, cardTitle, speechOutput);
  },
  function (error) {
    var speechOutput = "Something went wrong: " + error;
    response.tell(speechOutput, speechOutput);
  });
}

function getNewsJson(newsType, callback, errback) {
  var url = newsType == NEWS_TYPE.GOOD ? GOOD_NEWS_SOURCE : BAD_NEWS_SOURCE;
  https.get(url, function(res) {
    var body = '';

    res.on('data', function (chunk) {
        body += chunk;
    });

    res.on('end', function () {
        callback(JSON.parse(body));
    });
  }).on('error', function (e) {
      console.log("Got error: ", e);
      errback(e);
  });
}

function buildNews(newsJson) {
  var newsBody = '';

  for (var newsIndex = 0; newsIndex < newsJson.length; newsIndex++){
        var obj = newsJson[newsIndex];
        newsBody = newsBody + obj.title + "\n\n";
  }
  return newsBody;
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the SpaceGeek skill.
    var news = new News();
    news.execute(event, context);
};

