var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEED;
var CLIENT_ID = require('../config/config').CLIENT_ID;

var app = express();

var Usuario = require('../models/usuario');

//google
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);


//==========================
//Autentificacion google
//==========================
async function verify(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    const userid = payload['sub'];
    // If request specified a G Suite domain:
    //const domain = payload['hd'];

    return {
        nombre: payload.name,
        email: payload.email,
        img: payload.picture,
        google: true
    }
}


app.post('/google', async(req, res) => {

    var token = req.body.token;
    var googleUser = await verify(token).catch(err => {
        return res.status(403).json({
            ok: false,
            mensaje: 'Token no válido',
        });
    });


    Usuario.findOne({ email: googleUser.email }, (err, usuariodb) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al loguearse',
                errors: err
            });
        }

        if (usuariodb) {
            if (usuariodb.google === false) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Debe usar su autentificacion normal',
                    errors: err
                });
            } else {
                usuariodb.password = ':)';
                var token = jwt.sign({ usuario: usuariodb }, SEED, { expiresIn: 86400 }); //24 horas
                res.status(201).json({ ok: true, usuario: usuariodb, token: token, id: usuariodb._id });
            }
        } else {
            //El usuario no existe, hay que crearlo
            var usuario = new Usuario();
            usuario.nombre = googleUser.nombre;
            usuario.email = googleUser.email;
            usuario.img = googleUser.img;
            usuario.password = ':)';
            usuario.google = true;

            usuario.save((err, usuarioCreado) => {
                var token = jwt.sign({ usuario: usuarioCreado }, SEED, { expiresIn: 86400 }); //24 horas
                res.status(201).json({ ok: true, usuario: usuarioCreado, token: token, id: usuarioCreado._id });
            });
        }

    });


    // res.status(200).json({
    //     ok: true,
    //     mensaje: 'Login google aceptado',
    //     googleUser: googleUser
    // });
});

//==========================
//Autentificacion normal
//==========================


app.post('/', (req, res) => {

    var body = req.body;

    Usuario.findOne({ email: body.email }, (err, usuarioEncontrado) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al loguearse',
                errors: err
            });
        }

        if (!usuarioEncontrado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Error al loguearse - email',
                errors: { message: 'Usuario no encontrado' }
            });
        }

        if (!bcrypt.compareSync(body.password, usuarioEncontrado.password)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Error al loguearse - password',
                errors: { message: 'Password incorrecto' }
            });
        }

        usuarioEncontrado.password = ':)';
        //crear token
        var token = jwt.sign({ usuario: usuarioEncontrado }, SEED, { expiresIn: 86400 }); //24 horas
        res.status(201).json({ ok: true, usuario: usuarioEncontrado, token: token, id: usuarioEncontrado._id });
    });

});


module.exports = app;