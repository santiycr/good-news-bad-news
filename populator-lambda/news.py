import boto
import boto.s3.connection
import json
import urllib
import urllib2


with open('credentials.json') as f:
    credentials = json.loads(f.read())
    AWS_ACCESS_KEY = credentials['AWS_ACCESS_KEY']
    AWS_SECRET_KEY = credentials['AWS_SECRET_KEY']
    NEWS_API_KEY = credentials['NEWS_API_KEY']
    SENTIMENT_API_KEY = credentials['SENTIMENT_API_KEY']

S3_BUCKET = 'good-news-bad-news'
S3_BADNEWS = 'bad-news.json'
S3_GOODNEWS = 'good-news.json'
CATEGORIES = ['World', 'Politics', 'US']
NEWS_BASE_URL = 'https://api.cognitive.microsoft.com/bing/v5.0/news'
SENTIMENT_BASE_URL = \
    'https://api.havenondemand.com/1/api/sync/analyzesentiment/v1'


def clean(text):
    # Remove non-ascii characters from text.
    return ''.join([i if ord(i) < 128 else '' for i in text])


def fetch_articles(category):
    url = '%s?Category=%s' % (NEWS_BASE_URL, category)
    headers = {'Ocp-Apim-Subscription-Key': NEWS_API_KEY}

    req = urllib2.Request(url, headers=headers)
    resp = urllib2.urlopen(req)
    articles = json.loads(resp.read())['value']
    return zip([clean(a['name']) for a in articles],
               [clean(a['description']) for a in articles])


def get_sentiment(text):
    values = {'apikey': SENTIMENT_API_KEY,
              'text': text}

    data = urllib.urlencode(values)
    req = urllib2.Request(SENTIMENT_BASE_URL, data)
    resp = urllib2.urlopen(req)
    result = json.loads(resp.read())
    return result['aggregate']


def upload_to_s3(name, content):
    conn = boto.connect_s3(
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY)
    bucket = conn.create_bucket(S3_BUCKET)
    key = bucket.new_key(name)
    key.set_contents_from_string(content)
    key.set_acl('public-read')


def get_news():
    results = []
    for category in CATEGORIES:
        for a in fetch_articles(category):
            title = a[0]
            abstract = a[1]
            sentiment = get_sentiment(abstract)
            if sentiment['score'] != 0.0:
                results.append({'title': title,
                                'abstract': abstract,
                                'sentiment': sentiment})
    return results


def handler(event, context):
    news = get_news()
    badnews = json.dumps(
        [x for x in news if x['sentiment']['sentiment'] == 'negative'])
    goodnews = json.dumps(
        [x for x in news if x['sentiment']['sentiment'] == 'positive'])
    upload_to_s3(S3_BADNEWS, badnews)
    upload_to_s3(S3_GOODNEWS, goodnews)


if __name__ == '__main__':
    # handler(None, None)
    news = get_news()
    badnews = json.dumps(
        [x for x in news if x['sentiment']['sentiment'] == 'negative'])
    goodnews = json.dumps(
        [x for x in news if x['sentiment']['sentiment'] == 'positive'])
    print 'Bad news'
    print badnews
    print 'Good news'
    print goodnews
