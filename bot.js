const {Client, Attachment} = require('discord.js12');
const Discord = require('discord.js12');
const bot = new Client();
const cron = require("cron");
const QuickChart = require('quickchart-js');

const token = 'Your token here';


const { Pool } = require('pg');
const prefix = '*';

var express = require('express');
let app1 = express();  // Compliant
app1.disable("x-powered-by");

let helmet = require("helmet");
let app = express(); // Compliant
app.use(helmet.hidePoweredBy());

app.set('port', (process.env.PORT || 5000));

//For avoidong Heroku $PORT error
app.get('/', function(request, response) {
    var result = 'App is running'
    response.send(result);
}).listen(app.get('port'), function() {
    console.log('App is running, server is listening on port ', app.get('port'));
});


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const config = {
  // ssl: true, 
  port: 5432,
  host: 'YOUR HOST',
  user: 'USER',
  password: 'PASSWORD',
  database: 'DATABASE',
  dialectOptions: {
  ssl: {
      require: true,
      rejectUnauthorized: false,
    },
    keepAlive: true,        
  },      
  ssl: true,
  define: {
    timestamps: false,
  },
};

const pool = new Pool(config);
const graphic = new QuickChart()
graphic
  .setWidth(800)
  .setHeight(400)
  .setBackgroundColor('white');

const getMemberStats = async (memberid, message) => {

  try {
      const res = await pool.query("select * from mymember where member_id = ?",[memberid]);
      bot.users.cache.get(message.author.id).send(res.rows);
  } catch (e) {
      console.log(e);
  }
  
};

const getMemberExp = async (memberid, message, days) => {
  try {
      const res = await pool.query("select * from memberexpenses where member_id = ?",[message]);

      let dic = res.rows;

      var nowstr = new Date().toLocaleString('en-US', {timeZone: "America/Lima"}).split(",");
      nowstr = nowstr[0].split("/").map(x=>+x);
      var tempday = new Date(nowstr[2],nowstr[0]-1,nowstr[1]);
      tempday.setDate(tempday.getDate()-days);
      tempday = tempday.toLocaleString('en-US').split(",");
      tempday = tempday[0].split("/").map(x=>+x);

      var from = new Date(tempday[2], tempday[0]-1, tempday[1]); 
      var to   = new Date(nowstr[2], nowstr[0]-1, nowstr[1]);
      for(let j = 0; j < dic.length; j++)
      {
        var checkstr = (dic[j]["timeregister"]).split(",");
        checkstr = checkstr[0].split("/").map(x=>+x);
        var check = new Date(checkstr[2], checkstr[0]-1, checkstr[1]);


        if(check >= from && check <= to) bot.users.cache.get(message.author.id).send("**Pago** "+ parseInt(j+1) + "\n Día y hora: "+ dic[j]["timeregister"] + "\n Gasto: " + parseInt(dic[j]["expense"])+ "\n Tipo de moneda: " + dic[j]["moneytype"] + "\n Juego o descripción: " + dic[j]["game"]  + "\n\n");
      }
  } catch (e) {
      console.log(e);
  }
};

const getMemberT = async (memberid, message, days) => {
  try {
      const res = await pool.query("select * from memberexpenses where member_id = ?",[memberid]);

      let dic = res.rows;
      for(let j = 0; j < dic.length; j++)
      {
        bot.users.cache.get(message.author.id).send("**Pago** "+ parseInt(j+1) + "\n Día y hora: "+ dic[j]["timeregister"] + "\n Gasto: " + parseInt(dic[j]["expense"])+ "\n Tipo de moneda: " + dic[j]["moneytype"] + "\n Juego o descripción: " + dic[j]["game"]  + "\n\n");
      }
      
  } catch (e) {
      console.log(e);
  }
};

const getGraphics = async (message, type) => {
  const memberid = message.author.id.toString()
  try {
    if (type == "porjuego") {
      // Query database
      const res = await pool.query("select game, sum(expense) from memberexpenses where member_id = ? group by game",[memberid]);
      let dic = res.rows;
      if (dic.length == 0) {
        bot.users.cache.get(message.author.id).send("No tienes pagos registrados")
      }
      // Parse data
      let labels = []
      let data = []
      for (let i of dic) {
        labels.push(i['game'])
        data.push(i['sum'])
      }
      const total = data.reduce((a, b) => parseInt(a) + parseInt(b)).toString()
      // Configure graphic
      graphic.setConfig({
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{data: data}],
        },
        options: {
          plugins: {
            doughnutlabel: {
              labels: [{text: total, font: {size:20}}, {text: 'total'}]
            }
          }
        }
      })

      const url = await graphic.getShortUrl()
      bot.users.cache.get(message.author.id).send(`${url}`)
    }

  } catch (e) {
    console.log(e)
  }

}

const sendmembers = async (number) => {
  try {
      const res = await pool.query("select * from mfrequency where frequency = ?",[number]);

      let dic = res.rows;
      for(let j of dic)
      {
        if(number == 1) bot.users.cache.get(j[member_id]).send("Recordatorio diario si has tenido una compra en el último día.");
        if(number == 2) bot.users.cache.get(j[member_id]).send("Recordatorio semanal si has tenido una compra en la última semana.");
        if(number == 3) bot.users.cache.get(j[member_id]).send("Recordatorio mensual si has tenido una compra en el último mes.");
      }
      
  } catch (e) {
      console.log(e);
  }
};


const insertUser = async (memberid, date, message) => {
  try {
      const text = "INSERT INTO mymember(member_id, datecreate, actualstate) VALUES ("+"'"+memberid +"','"+date+"', 0)";
      const res = await pool.query(text);
      console.log(res)
      bot.users.cache.get(message.author.id).send("Registrado");
  } catch (e) {
      console.log(e);
      bot.users.cache.get(message.author.id).send("Hubo un error al registrar");
  }
};


const insertFrec = async (memberid, frec, message) => {
  if(frec>3 || frec<1) 
  {
    bot.users.cache.get(message.author.id).send("Parametro equivocado");
    return;
  }
  try {
      const text = "INSERT INTO mfrequency(member_id, frequency) VALUES ("+"'"+memberid +"',"+frec+")";
      const res = await pool.query(text);
      console.log(res)
      bot.users.cache.get(message.author.id).send("Frecuencia registrada");
  } catch (e) {
      console.log(e);
      bot.users.cache.get(message.author.id).send("Hubo un error al registrar");
  }
};

const insertExp = async (memberid, expense, typemoney, game, time, message) => {
  if(expense < 0) 
  {
    bot.users.cache.get(message.author.id).send("Parametro equivocado, es negativo");
    return;
  }
  try {
    const text = "INSERT INTO memberexpenses(member_id, timeregister, moneytype, expense, game) VALUES ('" + memberid + "','" + time+ "','" + typemoney + "',"  + expense + ", '" + game +"' )";
      const res = await pool.query(text);
      console.log(res)
      bot.users.cache.get(message.author.id).send("Pago registrado");
  } catch (e) {
      console.log(e);
      bot.users.cache.get(message.author.id).send("Hubo un error al registrar");
  }
};

bot.on('ready', async() =>{
  console.log(String(bot.user.username) + ' is online!');
  bot.user.setActivity(" ;p ", {type: "LISTENING"}).catch(console.error);

  let scheduledMessaged = new cron.CronJob('19 00 00 * * *', () => {
    sendmembers(1);
  },undefined, true, "America/Lima");
  let scheduledMessages = new cron.CronJob('19 00 00 * * 1', () => {
    sendmembers(2);
  },undefined, true, "America/Lima");
  let scheduledMessagem = new cron.CronJob('19 00 00 1 * *', () => {
    sendmembers(3);
  },undefined, true, "America/Lima");
  
  scheduledMessaged.start();
  scheduledMessages.start();
  scheduledMessagem.start();
})

const info_msg = "> **¡Bienvenido al servidor!**\n> \n> **Regístrate** escribiendo `registrar`.\n> \n> Señala qué tan frecuentemente quieres que te preguntemos **cuánto has gastado** con `frecuencia <n>` (sin los `<>`). Donde `n` es un valor entre 1 y 3:\n> `1` = diario\n> `2` = semanal\n> `3` = mensual\n> \n> **Registra un pago** con `pago`. El comando va de la siguiente manera: `pago <monto> <tipo de moneda> <juego o alguna descripción específica>` (sin los `<>`). \n> **Para tus gastos** `gastos`.\n> **Genera un grafico** de tus gastos por juego con `grafico porjuego` y por mes con `grafico pormes`.\n> Crea un **presupuesto** para un juego con `presupuesto juego <nombre> <monto>`. Donde `nombre` es el nombre del juego y `monto` el monto máximo que deseas gastar en ese juego."


bot.on('guildMemberAdd', (member) => {
  bot.users.cache.get(member.id).send(info_msg);
});

bot.on('message',message=>{
  let args_list = message.content.toLowerCase().split(" ");
  
  switch(args_list[0])
  {
    case "info":
      try {
        bot.users.cache.get(message.author.id).send(info_msg)
      } catch (e) {
        console.log(e)
      }
      break;
    case "registrar":
      insertUser(message.author.id.toString(), new Date().toLocaleString('en-US', {timeZone: "America/Lima"}), message);
      break;
    case "frecuencia":
      insertFrec(message.author.id.toString(), parseInt(args_list[1]), message);
      break;
    case "pago":
      try 
      {
        console.log(args_list[2].length);
        let game = message.content.substring(args_list[0].length + args_list[1].length + args_list[2].length + 3 );
        game = game.toLowerCase();
        insertExp(message.author.id.toString(), parseInt(args_list[1]), args_list[2], game, new Date().toLocaleString('en-US', {timeZone: "America/Lima"}), message);
      } catch (e) {
      }
    break;
    case "pagod":
      try 
      {
        console.log(args_list[2].length);
        let game = message.content.substring(args_list[0].length + args_list[1].length + args_list[2].length + args_list[3].length + 4 );
        game = game.toLowerCase();
        var day = args_list[3].split("/").map(x=>+x)
        var dated = new Date(day[2], day[0]-1, day[1]);
        insertExp(message.author.id.toString(), parseInt(args_list[1]), args_list[2], game, dated.toLocaleString('en-US'), message);
      } catch (e) {
      }
    break;
    case "getpagos":
      getMemberExp(message.author.id.toString(), message, args_list[1]);
    break;
    case "gettotal":
      getMemberT(message.author.id.toString(), message, args_list[1]);
    break;
    case "grafico":
      getGraphics(message, args_list[1]);
      break;
    default:
      try 
      {
        if(message.guild === null)
          bot.users.cache.get(message.author.id).send("Intenta ingresar otro comando!");
      } catch (e) {
      }
  }
})

bot.login(token);