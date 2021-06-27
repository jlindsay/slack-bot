import { RTMClient }  from '@slack/rtm-api'
import { SLACK_OAUTH_TOKEN, BOT_CHANNEL } from './constants'
import { WebClient } from '@slack/web-api';
const packageJson = require('./package.json')

const rtm = new RTMClient(SLACK_OAUTH_TOKEN);
const web = new WebClient(SLACK_OAUTH_TOKEN);

const https = require('https')

rtm.start()
  .catch(console.error);

rtm.on('ready', async () => {
    console.log('bot started')
    sendMessage(BOT_CHANNEL, `Bot version ${packageJson.version} is online.`)
})

rtm.on('slack_event', async (eventType, event) => {
    console.log("slack_event:", eventType )
    console.log("slack_event:", event )
    if (event && event.type === 'message'){

        var commands = String(event.text).split(" ")
        //console.log("commands:",commands);
        switch(String(commands[0]))
        {
          case "!hello":
            hello(event.channel, event.user)
            break;
          case "!quoteme":
          case "!qme":
            var words = commands.splice(1,commands.length)
            console.log(words)
            quoteme(event.channel, event.user, words.join(" "))
            break;
          case "!speak":
            speak(event.channel, event.user)
            break;
          default:
            break;
        }

    }
})


function hello (channelId, userId)
{
    sendMessage(channelId, 'Howdy! <@${userId}>')
}

function speak(channelId, userId)
{
  var r = Math.floor(Math.random() * quotes.length)
  var quote = quotes[r];
      sendMessage(channelId, quote )
}

async function sendMessage(channel, message) {
    await web.chat.postMessage({
        channel: channel,
        text: message,
    })
}


function quoteme($channelId, $userId, words)
{
    console.log("words:",words)
    //newsfeed-api?action=create-post&userid=JDL007&content=One+two+three&metadata_url=&metadata_thumbnail_url=&metadata_video_url=&metadata_title=&metadata_description=&metadata_locale=&metadata_date=&metadata_type=&metadata_request_url=&metadata_site_name=&metadata_charset=&_=1624313263200

    findCard(words, function(metadata){
        console.log("findCard:success:metadata:", metadata);
        postCard(words, metadata, function($data){
            console.log("postCard:success:", $data);
            var msg = "<@${"+$userId+"}> here is your quote: https://video.lindsayfilm.com/p/" + $data.uid
            sendMessage($channelId, msg )
        })
    })

}

function postCard($msg, $meta, $cb)
{
  //lindsayfilm api: https://video.lindsayfilm.com/newsfeed-api?action=create-post&userid=JDL007&content=One+two+three&metadata_url=&metadata_thumbnail_url=&metadata_video_url=&metadata_title=&metadata_description=&metadata_locale=&metadata_date=&metadata_type=&metadata_request_url=&metadata_site_name=&metadata_charset=&_=1624313263200
  var str =  "&metadata_url=" + encodeURIComponent($meta.url)
      str += "&metadata_thumbnail_url=" + encodeURIComponent($meta.thumbnail_url)
      str += "&metadata_video_url=" + encodeURIComponent($meta.video_url)
      str += "&metadata_title=" + encodeURIComponent($meta.title)
      str += "&metadata_description=" + encodeURIComponent($meta.description)
      str += "&metadata_locale=" + encodeURIComponent($meta.locale)
      str += "&metadata_date=" + encodeURIComponent($meta.date)
      str += "&metadata_type=" + encodeURIComponent($meta.type)
      str += "&metadata_request_url=" + encodeURIComponent($meta.request_url)
      str += "&metadata_site_name=" + encodeURIComponent($meta.site_name)
      str += "&metadata_charset=" + encodeURIComponent($meta.charset)

  var req = https.request({ hostname: 'video.lindsayfilm.com',
                              port: 443,
                              path: '/newsfeed-api?action=create-post&userid=JDL007&content='+encodeURIComponent($msg)+str,
                              method: 'GET'}, res => {
              //console.log("statusCode: ${res.statusCode}")
              var _data = '';
              res.on('data', chunk => {
                _data += chunk;
              })

              res.on('end', function(d){
                var res = JSON.parse(_data);
                $cb(res.data[0])
                //var msg = "here is your quote: https://video.lindsayfilm.com/p/" + response.data[0].uid
                //sendMessage(channelId, $msg )
              });
  })

  req.end()
}


function findCard($msg, $cb)
{
    console.log("findCard:", $msg)
    var _urls = findURLs($msg)

    if( _urls.length > 0 ){
        var last_index = _urls.length-1
        var url = _urls[last_index]
            getCardHTMLbyURL(url, $cb )
   }
}

function getCardHTMLbyURL( $url, $cb)
{
      console.log("getCardHTMLbyURL::url:", $url)
      //$config.type = "post" "comment"
      fetchURL_oembed_and_ogs( $url, { success : function( $data  ){
           console.log("fetchURL_oembed_and_ogs:success:data:", $data)

           var card_metadata = {  url           : $url, //$data.ogUrl,
                                  title         : $data.ogs.ogTitle? $data.ogs.ogTitle : null,
                                  description   : $data.ogs.ogDescription ? $data.ogs.ogDescription : null,
                                  thumbnail_url : $data.ogs.ogImage ? $data.ogs.ogImage.url : null,
                                  video_url     : $data.ogs.ogVideo ? $data.ogs.ogVideo.url : null ,
                                  locale        : $data.ogs.ogLocale? $data.ogs.ogLocale : null,
                                  date          : $data.ogs.ogDate? $data.ogs.ogDate : null ,
                                  type          : $data.ogs.ogType? $data.ogs.ogType : null,
                                  request_url   : $data.ogs.requestUrl? $data.ogs.requestUrl : null,
                                  site_name     : $data.ogs.ogSiteName? $data.ogs.ogSiteName : null,
                                  charset       : $data.ogs.charset? $data.ogs.charset : null,
                                  ogs           : $data.ogs? $data.ogs : null,
                                  oembed        : $data.oembed? $data.oembed : null
                               }

           $cb( card_metadata )
      }})
}

function fetchURL_oembed_and_ogs( $url, $config )
{
      console.log("NewFeedManager::fetchURL_oembed_and_ogs:url:", $url);

      var req = https.request({ hostname: 'video.lindsayfilm.com',
                                  port: 443,
                                  path: '/oembed_ogs?url='+$url,
                                  method: 'GET'}, res => {

                  var _data = '';
                  res.on('data', chunk => {
                      _data += chunk;
                  })

                  res.on('end', function (d) {
                      var res = JSON.parse(_data);
                      $config.success(res)
                  });
      })

      req.end()

}

function findURLs($input)
{
   console.log("findURLs:input:", $input, ", typeof:", typeof($input) );
   $input = $input.replace(">", "")//slack inserts this on urls
   $input = $input.replace("<", "")

   var words = [];
       words = $input.split(" ");
   var _urls = [];

   for( var i = 0; i < words.length; i++ )
   {
       var word = words[i];
       var _isURL = isURL( word );
       if( _isURL ){
          _urls.push(word)
       }
   }

   return _urls;
}

function isURL(str)
{
   var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
   var url = new RegExp(urlRegex, 'i');
   return str.length < 2083 && url.test(str);
}



//lindsayfilm api: https://video.lindsayfilm.com/newsfeed-api?action=create-post&userid=JDL007&content=One+two+three&metadata_url=&metadata_thumbnail_url=&metadata_video_url=&metadata_title=&metadata_description=&metadata_locale=&metadata_date=&metadata_type=&metadata_request_url=&metadata_site_name=&metadata_charset=&_=1624313263200

var quotes = ["A gun is not a weapon, it’s a tool, like a hammer or a screwdriver or an alligator.",
              "Weaseling out of things is important to learn; it’s what separates us from the animals… except the weasel.",
              "Operator! Give me the number for 911!",
              "If he’s so smart, how come he’s dead?",
              "Marge, you know it’s rude to talk when my mouth is full.",
              "My beer! You never had a chance to become my urine!",
              "Stupidity got us into this mess, and stupidity will get us out.",
              "Trying is the first step towards failure.",
              "Oh yeah, what are you gonna do? Release the dogs? Or the bees? Or the dogs with bees in their mouths and when they bark, they shoot bees at you?",
              "Kids, just because I don’t care doesn’t mean I’m not listening.",
              "I wish God were alive to see this.",
              "Roads are just a suggestion Marge, just like pants.",
              "We can outsmart those dolphins. Don’t forget – we invented computers, leg warmers, bendy straws, peel-and-eat shrimp, the glory hole, and the pudding cup.",
              "If it doesn’t have Siamese twins in a jar, it is not a fair.",
              "I’m like that guy who single-handedly built the rocket & flew to the moon. What was his name? Apollo Creed?",
              "If God didn’t want me to eat chicken in church, then he would have made gluttony a sin.",
              "Volunteering is for suckers. Did you know that volunteers don’t even get paid for the stuff they do?",
              "Just sit through this NRA meeting Marge, and if you still don’t think guns are great then we’ll argue some more.",
              "When will I learn? The answer to life’s problems aren’t at the bottom of a bottle, they’re on TV!",
              "Kids are great. You can teach them to hate what you hate and, with the Internet and all, they practically raise themselves.",
              "Oh, I have three kids and no money. Why can’t I have no kids and three money?",
              "I want to share something with you: The three little sentences that will get you through life. Number 1: Cover for me. Number 2: Oh, good idea, Boss! Number 3: It was like that when I got here.",
              "I’m normally not a praying man, but if you’re up there, please save me Superman.",
              "Even communism works… in theory.",
              "It’s so simple to be wise… just think of something stupid to say and then don’t say it.",
              "Fame was like a drug, but what was even more like a drug were the drugs.",
              "English? Who needs that? I’m never going to England.",
              "I believe that children are our future. Unless we stop them now.",
              "You can have all the money in the world, but there’s one thing you will never have… a dinosaur.",
              "You’re everywhere. You’re omnivorous.",
              "I never apologize… I’m sorry but that’s the way I am.",
              "I thought I had an appetite for destruction, but all I wanted was a club sandwich.",
              "I’ll make the money by selling one of my livers… I can get by with one.",
              "Television! Teacher, mother, secret lover.",
              "Vampires are make-believe, just like elves, gremlins and Eskimos.",
              "I like my beer cold… my TV loud… and my homosexuals flaming.",
              "The problem in the world today is communication… too much communication.",
              "Marge, try to understand. There are two types of college students, jocks and nerds. As a jock, it is my duty to give nerds a hard time.",
              "If I could say a few words… I would be a better public speaker.",
              "What’s the point of going out? We’re just going to wind up back here anyway.",
              "A woman is a lot like a refrigerator: 6 feet tall, 300 pounds… it makes ice.",
              "To alcohol! The cause of, and solution to, all of life’s problems.",
              "I think the saddest day of my life was when I realised I could beat my dad at most things, and Bart experienced that at the age of four.",
              "Marge it takes two to lie. One to lie and one to listen.",
              "Getting out of jury duty is easy. The trick is to say you’re prejudiced against all races.",
              "Lisa, if you don’t like your job you don’t strike. You just go in every day and do it really half-assed.",
              "Old people don’t need companionship. They need to be isolated and studied so it can be determined what nutrients they have that might be extracted for our personal use.",
              "Marge, your cooking only has two moves: Shake and Bake.",
              "If The Flintstones has taught us anything, it’s that pelicans can be used to mix cement.",
              "Stupid sexy Flanders!",
              "He’s about to learn the most important lesson in the music business: don’t trust people in the music business.",
              "As the Bible says, ‘Screw that!",
              "You’ll have to speak up. I’m wearing a towel.",
              "Stupid family. Won’t even come to my Rapture. I went to Lisa’s play! Which had serious pacing problems.",
              "I hope I didn’t brain my damage.",
              "What are you guys laughing at? If you say Jimmy Fallon, I’ll know you’re lying.",
              "Overdue book? This is the biggest frame-up since OJ! Wait a minute. Blood in the Bronco. The cuts on his hands. Those Jay Leno monologues. Oh my god, he did it!",
              "I was working on a flat tax proposal and I accidentally proved there’s no god.",
              "Why don’t those stupid idiots let me in their stupid club for jerks?",
              "Oh, look! Pantyhose. Practical and alluring.",
              "Okay. I’m not going to kill you, but I’m going to tell you three things that will haunt you the rest of your days. You ruined your father. You crippled your family. And baldness is hereditary!",
              "Marge, I can’t wear a pink shirt to work. Everybody wears white shirts. I’m not popular enough to be different.",
              "A boy without mischief is like a bowling ball without a liquid center.",
              "I’m really glad you corrected me, Lisa. People are always really glad when they’re corrected.",
              "Do not touch Willie’. Good advice.",
              "You keep disappearing and reappearing and you’re not even funny. You’re just like that show Scrubs!",
              "Why would women want to go to a gym if there were no men there watching them and judging them?",
              "Sleeping bags on the floor, a roaring fire. It’ll be just like the time they kicked me out of the sporting goods store.",
              "But I thought bankruptcy was the cool law. The one that says, ‘Don’t worry about it. I got this.",
              "I guess some people never change. Or, they quickly change and then quickly change back.",
              "Bart, with $10,000, we’d be millionaires! We could buy all kinds of useful things like… love!",
              "Marge, don’t worry. It’s like when we stopped paying the phone bill. They stopped calling us. In fact everyone did.",
              "Son, if you really want something in this life, you have to work for it. Now quiet! They’re about to announce the lottery numbers.",
              "That’s it! You people have stood in my way long enough. I’m going to clown college!",
              "I think Smithers picked me because of my motivational skills. Everyone says they have to work a lot harder when I’m around.",
              "You’re saying butt-kisser like it’s a bad thing!",
              "Facts are meaningless. You could use facts to prove anything that’s even remotely true!"]
