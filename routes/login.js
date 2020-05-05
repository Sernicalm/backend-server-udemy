var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEED;

var app = express();

var Usuario = require('../models/usuario');

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