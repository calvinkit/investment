var synaptic = require('synaptic'); // this line is not needed in the browser
var fs = require('fs');
var util = require('util');

var Neuron = synaptic.Neuron,
    Layer = synaptic.Layer,
    Network = synaptic.Network,
    Trainer = synaptic.Trainer,
    Architect = synaptic.Architect;

var myNetwork = new Architect.LSTM(1,5,1);
var neurons = myNetwork.neurons();
// Change to identity for output
//console.log(neurons.filter((e)=>e.layer=='output'));
neurons.filter((e)=>e.layer=='output').forEach((e) => { e.neuron.squash = Neuron.squash.LOGISTIC });
//neurons.filter((e)=>e.layer=='output').forEach((e) => { e.neuron.squash = Neuron.squash.IDENTITY });
//console.log(neurons.filter((e)=>e.layer=='output'));

var trainer = new Trainer(myNetwork);
var trainOpt = { rate: 0.05, iterations: 200000, error: 0.000001, log: 1000, cost: Trainer.cost.MSE };

var trainingSet = [
{ input: [0], output: [0] },
{ input: [0], output: [0] },
{ input: [0], output: [1] },
{ input: [1], output: [0] },
{ input: [0], output: [0] },
{ input: [0], output: [0] },
{ input: [0], output: [1] },
    ];

var trainingSet = [];
var history = [];
//for (var i=0; i<=200; i++) history.push(i);
//for (var i=0; i<50; i++) { trainingSet[i] = { input:[history[i]], output: [ history[i+5] ] } }
trainer.train(trainingSet, trainOpt);
console.log(myNetwork.activate([0]));
console.log(myNetwork.activate([0]));
console.log(myNetwork.activate([0]));
console.log(myNetwork.activate([1]));
console.log(myNetwork.activate([0]));
