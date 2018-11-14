var tf = require('@tensorflow/tfjs');


// Step 1: Data
var x = tf.randomUniform([100], 0, 3).div(tf.scalar(10));
var y = tf.tidy(() => {
    //y = 3x^2 + 2x - 6.5 + noise
    return  tf.scalar(3).mul(x.square())
        .add(tf.scalar(2).mul(x))
        .sub(tf.scalar(6.5))
        .add(tf.randomNormal([100],0,1));
});

// Step 2: Setup training process and error funcs
var a = tf.variable(tf.scalar(Math.random()));
var b = tf.variable(tf.scalar(Math.random()));
var c = tf.variable(tf.scalar(Math.random()));
var predict = (x) => {
    return a.mul(x.square())
        .add(b.mul(x))
        .add(c);
};

var error = (x) => {
    return predict(x).sub(y).square().mean();
};


// Train
var iterations = 100;
var learnRate = 0.5;
var optimizer = tf.train.sgd(learnRate);

async function train(numIter) {
    for (var i=0; i<numIter; i++) {
        optimizer.minimize(() => error(x));
    }
    await tf.nextFrame();
}

async function learnCoeff() {
}



//var loss(prediction, labels) => {
//    return predic
//}

//var model = tf.sequential();
//model.add(tf.layers.dense({units:1, inputShape: [1]}));
//model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});
//
//var xs = tf.tensor2d([1,2,3,4],[4,1]);
//var ys = tf.tensor2d([1,3,5,7],[4,1]);
//
//model.fit(xs, ys, { epochs: 10}).then(() => {
//    model.predict(tf.tensor2d([5],[1,1])).print();
//});
//
