const express = require('express')
const axios = require('axios')
const moment = require('moment')
var bodyParser = require('body-parser')
var { Parser } = require('json2csv')



var urlencodedParser = bodyParser.urlencoded({ extended: false })

const app = express()
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

const port = 5000

const configs = {
	serverUrl: '', //Your server URL
	authToken: '',//Generate your Auth Token
	authUser: '', //Your user Id
	days: '', //Days that you want to view data
	disable: '' //If you also want to disable these users
}

const infos = {
	users: '',

}



app.get('/', (req, res) => {
	res.render(__dirname + '/index', {title: infos.users})
});

app.post('/checkdata', urlencodedParser, (req, res) => {

	if(req.body.disable){
		req.body.disable = true
	}
	else{
		req.body.disable = false
	}

	configs.serverUrl = req.body.serverUrl
	configs.authToken = req.body.authToken
	configs.authUser = req.body.authUser
	configs.days = req.body.days
	configs.disable = req.body.disable 

	getUserList(res)
});

app.get('/export', (req, res) => {
	getUserList(res)
})

async function getUserList(res){

	try {
		let result = await axios.get(`${configs.serverUrl}/api/v1/users.list?count=9999&offset=0&fields={"lastLogin":1}`, {
			headers: {
				'X-Auth-Token': configs.authToken,
				'X-User-Id': configs.authUser
			}
		})

		if(result.status == 200){ 

			createUserList(res, result.data.users)
		}
		}
		catch (err) {
			console.error(err);
		}
}

function createUserList(res, data) {

	let result = []
	let count = 0

	let dateNow = moment().subtract(configs.days, 'days').format();

	for (let index = 0; index < data.length; index++) {

		data[index].lastLogin = moment(data[index].lastLogin).format()

		if (data[index].active === true) {
			if(data[index].lastLogin < dateNow){
				data[index].lastLogin = moment(data[index].lastLogin).format('DD/MM/YYYY')
				result.push(data[index])
			} 
		} 
	}


	if(configs.disable === true){
		disableUsers(res, result)
	}
	else{
		exportToCsv(res, result)
	}

}

async function disableUsers(res, data){

	console.info(`-- DISABLING USERS --`);
	console.info(`${data.length} users will be disabled`);

	for (let i = 0; i < data.length; i++) {
		try {
			let result = await axios.post(`${configs.serverUrl}/api/v1/users.setActiveStatus`, {'userId': data[i]._id, 'activeStatus': false, 'confirmRelinquish': true}, {
				headers: {
					'X-Auth-Token': configs.authToken,
					'X-User-Id': configs.authUser
				}
			})
		}
		catch (err) {
			console.error(err);
		}

	}
	exportToCsv(res, data)

}


function exportToCsv(res, data){
	console.info(`-- EXPORTING USERS --`);
	console.info(`${data.length} users will be exported`);

  infos.users = 'asdasd'

	const fields = ['_id', 'name', 'lastLogin', 'username'];
	const json2csv = new Parser({ fields: fields })

	try {
		const csv = json2csv.parse(data)
		res.attachment(`${configs.serverUrl}-${configs.days}days-userlist.csv`)
		res.send(csv)
	} catch (error) {
		console.log('error:', error.message)
		res.status(500).send(error.message)
	}

}


app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
		console.log('Go to browser and type: http://localhost:5000/export and see the magic happen :)')

})
