var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
var  db = mongojs('mongodb://zhiguo:zhiguowang1207@ds137230.mlab.com:37230/mytasklist_zhiguo', ['clinfo']);
var db2 = mongojs('mongodb://zhiguo:zhiguowang1207@ds137230.mlab.com:37230/mytasklist_zhiguo', ['effectiverate']);
var db3 = mongojs('mongodb://zhiguo:zhiguowang1207@ds137230.mlab.com:37230/mytasklist_zhiguo', ['mcc']);
var db4 = mongojs('mongodb://zhiguo:zhiguowang1207@ds137230.mlab.com:37230/mytasklist_zhiguo', ['count']);

var effectiveRateValOld = -1;
var effectiveRateValNew=-1;
var mccV = -1;

//respond the home page: 'index.ejs'
router.get('/', function(req, res, next) {
        res.render('index',
            { title: ' '
          });
});


//respond the home page: 'success.ejs'
router.get('/success', function(req, res, next) {
    res.send("Opps, you didn't input your information yet");
});


//respond the home page: 'mcc.ejs'
router.get('/mcc', function(req, res, next) {
    db2.mcc.find({},{"_id": 0}, function(err, mcc){


        res.json(mcc);
    });
    //res.send(mcc);
});

var compare = function(a,b) {
    console.log(a,b)
    a = parseFloat(a.effective_rate.substring(0, a.effective_rate.length-1));
    b = parseFloat(b.effective_rate.substring(0, b.effective_rate.length-1));
    console.log(a,b)
    if (a < b)
        return -1;
    if (a > b)
        return 1;
    return 0;
};

router.get('/effectiverate', function(req, res, next) {
    mccV = 5812;
    var erates = [];
    var op = [];


    console.log("MCC from form", mccV);
    db3.effectiverate.find({MCC: Number(mccV)},{"_id": 0}, function(err, effectiverate1){

        for(let i = 0; i < effectiverate1.length; i++) {
            if(!(erates.indexOf(effectiverate1[i]["Effectiverates"]) > -1 )) {
                erates.push(effectiverate1[i].Effectiverates);
            }
        }

        for(let i = 0; i < erates.length; i++) {
            erates[i]
            let count = 0;
            for(let j = 0; j < effectiverate1.length; j++) {
                if(effectiverate1[j].Effectiverates == erates[i]) {
                    count++;
                }
            }
            var tmp = {};

            tmp["type"]="normal";
            tmp["effective_rate"] = erates[i];
            tmp["count"]=count;
            op.push(tmp);
        }

        //console.log("OP", op);

        tmp={};
        tmp["type"]="new";
        tmp["effective_rate"]=effectiveRateValNew;
        tmp["count"]=1;
        op.push(tmp);

        tmp={};
        tmp["type"]="old";
        tmp["effective_rate"]=effectiveRateValOld;
        tmp["count"]=1;
        op.push(tmp);

        var arr1 = new Array();



        op.sort(compare);

        console.log("sorted", op);

        arr1.push(op);




        res.json(arr1);
    });
    //res.send(mcc);
});



//respond the home page: 'count.ejs'
router.get('/count', function(req, res, next) {

    var arr1=new Array();
    var ef;
    var count1;
    var type1;
    var obj;
    db4.count.find({},{}, function(err, count) {
        count.forEach(function (values) {

           ef = parseFloat(values['_id']);
           count1 = values['count'];
           type1 = values['type'];

           let objV = {};
           objV["type"] = type1;
           objV["effective_rate"] = ef;
           objV["count"] = count1;

           // obj =JSON.stringify({type:type1, effective_rate:ef, count:count1});
            arr1.push(objV);
        });


      var p=[];
      p.push(arr1);
      // console.log("p val", p);
      console.log("global variable", effectiveRateVal);
      res.json(p);

          // res.render('count',{
          //      value: p
          //   });


    });
});





//Save data to database and extract data from different collection of database
router.post('/success', function(req, res, next){
    var task = req.body;
    var mccD = req.body.Mcc;
    var mcc = parseInt(mccD);
    mccV = mcc;
    var totalFee = req.body.totalFee;
    var newTotalFee = "$"+totalFee;
    var avgTicket = req.body.avgTicket;
    var newAvgTicket = "$"+avgTicket;
    var volume = req.body.totalVolume;
    var newVolume="$"+volume
    var effectiveRate = Number(totalFee)/Number(volume);
    // old effective rate
    var effectiveRate1 = (effectiveRate*100).toFixed(2)+"%";
    effectiveRateValOld=effectiveRate1;

    //save all clients' data into database
    db.clinfo.save(task, function (err, task) {
    });


    //extract other effectiverate from database
    db2.effectiverate.find({MCC: Number(mcc)}, function(err, effectiverate2){

        var num = 0;
        var sum=0;
        //var arr = new Array();

        //loop to add all effectiverate and the number of items
        effectiverate2.forEach(function(values) {
            //console.log(parseFloat(values['Effectiverates']));
           // arr.push(parseFloat(values['Effectiverates']));
            num= num + parseFloat(values['Effectiverates']);
            sum = sum+1;
          });

           //arr.sort();
        //console.log(arr);
        // console.log(arr.length);

        //median of efective rate
         //var lowMiddle=Math.floor((arr.length-1)/2);
         //var highMiddle=Math.ceil((arr.length-1)/2);
         //var median = (arr[lowMiddle]+arr[highMiddle])/2+"%";

        //console.log(median);

         //average of effective rate
        var averageER = (num/sum).toFixed(2)+"%";
        effectiveRateVal = (num/sum).toFixed(2);
        effectiveRateValNew=averageER;
        //console.log("so the average effective rate is: "+averageER);
        var different = (Number(totalFee)-Number((volume)*(num/(sum*100)))).toFixed(2);
        var newDifferent="$"+different;
        //console.log(different);
        var yearSaving = (Number(different)*12).toFixed(2);
        var newYearSaving = "$"+yearSaving;
        var threeYearSaving="$"+yearSaving*3;
       // console.log(yearSaving);

        //insert effective rate into document of clinfo collection what we just created
        db.clinfo.update({"email": task.email}, {"$set":{"clientEffRate":effectiveRate1, "averageEffRate":averageER}});


        //MapReduce and create count collection
        db2.effectiverate.mapReduce(
            function() { emit(this.Effectiverates,1); },
            function(key, values) {return Array.sum(values)},
            {
                query:{MCC:Number(mcc)},
                out:{replace:"count"}
            }
        )


        //insert count 'type' data
        //db4.count.update({"_id":median}, {"$set":{"type":"median"}});
         //db4.count.update({}, {"$set":{"type":"normal"}}, {multi:true});
        // db4.count.insert({_id:averageER, count: 1, type: "new"});
        // db4.count.insert({_id:median, count: 1, type: "median"});
        // db4.count.insert({_id:effectiveRate1, count: 1, type: "old"});
        //db4.count.save({}, {"$set":{"_id":"2.55%"}});
        //db4.count.update({ }, {"$set":{"_id":averageER, "type":"old"}});
        //db4.count.update({"_id":averageER}, {"$set":{"type":"new"}});
        //change key name
       // db4.count.update({ }, {$rename: {"value":"count"}}, {multi:true});
       // db4.count.aggregate( {$project: {"count":"$value"}});


        //by if statement insert data into "count" collection
        // db4.count.find({},{}, function(err, count) {
        //
        //     count.forEach(function (values) {
        //         db4.count.update({}, {"$set": {"type": "normal"}});
        //     });
        //
        //     count.forEach(function (values) {
        //         if (values['_id'] != averageER)
        //             db4.count.insert({_id: averageER, value: 1, type: "new"});
        //         else
        //             db4.count.update({"_id": averageER}, {"$set": {"type": "new"}});
        //
        //     });
        //     count.forEach(function (values) {
        //         if (values['_id'] != effectiveRate1)
        //             db4.count.insert({_id: effectiveRate1, value: 1, type: "old"});
        //         else
        //             db4.count.update({"_id": effectiveRate1}, {"$set": {"type": "old"}});
        //     });
        // });



        //extract data from collection 'count' that just made in MapReduce
        //db4.count.find( function(err, count){

        //console.log(count);
        //render all data to success web page
        res.render('success', {
            data: task,
            title: 'you submitted your information successfully',
            mccD: mccD,
            effectiveRate: effectiveRate1,
            totalVolume: newVolume,
            avgTicket: newAvgTicket,
            totalFee: newTotalFee,
           // values: JSON.stringify(buinfo)
           // values: effectiverate2
            values: averageER,
            monthlySaving: newDifferent,
            yearlySaving: newYearSaving,
            threeYearSaving:threeYearSaving
            //count1: JSON.stringify(count)
            //count1: count
        //});
       });
    });
});

module.exports = router;
