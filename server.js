var express     = require('express');
var path        = require('path');
var cors        = require('cors');
var _           = require('lodash');
var rp          = require('request-promise');

var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(cors());

app.get('/ping', function(req,res){
    res.sendStatus(200);
});

app.post('/leagueLeaders', function(req,res){
    var promises = [];
    var statList = [];
    //for each team, hit the endpoint to get their current roster and season
    _.forEach(req.body, function(team){
        promises.push(rp('https://statsapi.mlb.com/api/v1/teams/'+team.id+'/roster/Active?hydrate=person(stats(type=season))'))
    });
    
    Promise.all(promises).then(function(data_arr){
        //data_arr is the array of all teams rosters;
        _.forEach(data_arr, function(team){
           team = JSON.parse(team);
           _.forEach(team.roster, function(player){
                if(player.person.stats && player.person.primaryPosition.name != "Pitcher"){
                    statList.push({
                        name: player.person.fullName,
                        id: player.person.id,
                        team: player.person.stats[0].splits[0].team.name,
                        position: player.person.primaryPosition.name,
                        avg: player.person.stats[0].splits[0].stat.avg,
                        obp: player.person.stats[0].splits[0].stat.obp,
                        slg: player.person.stats[0].splits[0].stat.slg,
                        ops: player.person.stats[0].splits[0].stat.ops,
                        hits: player.person.stats[0].splits[0].stat.hits,
                        rbi: player.person.stats[0].splits[0].stat.rbi ? player.person.stats[0].splits[0].stat.rbi : 0,
                        homeruns: player.person.stats[0].splits[0].stat.homeRuns,
                        str: player.person.stats[0].splits[0].stat.strikeOuts
                    })
                }
           })
        })

        var final = {
            avg: _.orderBy(statList, ['avg'],['desc']).slice(0,5),
            obp: _.orderBy(statList, ['obp'],['desc']).slice(0,5),
            slg: _.orderBy(statList, ['slg'],['desc']).slice(0,5),
            ops: _.orderBy(statList, ['ops'],['desc']).slice(0,5),
            hits: _.orderBy(statList, ['hits'],['desc']).slice(0,5),
            rbi: _.orderBy(statList, ['rbi'],['desc']).slice(0,5),
            homeruns: _.orderBy(statList, ['homeruns'],['desc']).slice(0,5),
            str: _.orderBy(statList, ['str'],['desc']).slice(0,5),
        }
        console.log(final);
        res.send(final);
    })
});

app.post('/hittingStats', function(req,res){
    var stats = req.body;
    console.log(stats);
    var final = {
        plateData: [],
        hitData:{
            values: [],
            hitObj: []
        }
    };

    _.forEach(stats, function(year){
        final.plateData.push(
            [{key: 'Hits', value: year.stat.hits},{key: 'Strikeouts', value: year.stat.strikeOuts}, {key: 'Walks', value: year.stat.baseOnBalls},{key: 'Ground Outs', value: year.stat.groundOuts},{key: 'Fly Outs', value: year.stat.airOuts}]
        )
        final.hitData.values.push([{key: 'Singles', value: year.stat.hits-year.stat.doubles-year.stat.triples-year.stat.homeRuns},{key: 'Doubles', value: year.stat.doubles}, {key: 'Triples', value: year.stat.triples},{key: 'Home Runs', value: year.stat.homeRuns}])
        final.hitData.hitObj.push({
            single: (parseInt(year.stat.hits-year.stat.doubles-year.stat.triples-year.stat.homeRuns)/parseInt(year.stat.hits)*100).toFixed(0),
            double: (parseInt(year.stat.doubles)/parseInt(year.stat.hits)*100).toFixed(0),
            triple: (parseInt(year.stat.triples)/parseInt(year.stat.hits)*100).toFixed(0),
            hr: (parseInt(year.stat.homeRuns)/parseInt(year.stat.hits)*100).toFixed(0)
        })
    });
    console.log(final);
    res.send(final);
});

app.post('/pitchingStats',function(req,res){
    var stats = req.body;
    console.log(stats)
    var final= {
        pitchData: [],
        resultData: {
            values: [],
            resultObj:[]
        }
    };

    _.forEach(stats, function(year){
        final.pitchData.push([{key: 'Strikes', value: year.stat.strikes},{key: 'Non-Strikes (Balls,Fouls,etc)', value: parseInt(year.stat.numberOfPitches-year.stat.strikes)}])
        final.resultData.values.push([{key: 'Strike Outs', value: year.stat.strikeOuts},{key: 'Walks', value: year.stat.baseOnBalls},{key: 'Hits', value: year.stat.hits},{key: 'Gound Outs', value: year.stat.groundOuts},{key: 'Air Outs', value: year.stat.airOuts}])
        var total  = year.stat.strikeOuts + year.stat.baseOnBalls + year.stat.hits + year.stat.groundOuts + year.stat.airOuts;
        final.resultData.resultObj.push({
            strP :(parseInt(year.stat.strikeOuts)/total*100).toFixed(0),
            wlkP :(parseInt(year.stat.baseOnBalls)/total*100).toFixed(0),
            hP :(parseInt(year.stat.hits)/total*100).toFixed(0),
            goP :(parseInt(year.stat.groundOuts)/total*100).toFixed(0),
            aoP :(parseInt(year.stat.airOuts)/total*100).toFixed(0)
        })
    })
    console.log(final);
    res.send(final);
})

app.get('/', function(req, res) {
  res.redirect('/');
});


// rewrite virtual urls to angular app to enable refreshing of internal pages
app.get('*', function (req, res, next) {
  res.sendFile(path.resolve('public/index.html'));
});


const port = process.env.PORT || 5000;
app.listen(port, function() {
    console.log('Listening on port 5000 ');
});

