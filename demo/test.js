const TM1637Display = require("../lib-with-queue");
// const TM1637Display = require("../lib-with-generator");

const Clk = 21;
const DIO = 20;

const t = new TM1637Display(Clk, DIO);

const g = [
    [0, 1, 2, 3],
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [5, 6, 7, 8],
    [6, 7, 8, 9],
    [7, 8, 9, 10],
    [8, 9, 10, 11],
    [9, 10, 11, 12],
    [10, 11, 12, 13],
    [11, 12, 13, 14],
    [12, 13, 14, 15],
    [13, 14, 15, 0],
    [14, 15, 0, 1],
    [15, 0, 1, 2],
];
// t.sendData([1, 2, 3, "a"]);

let count = 0;
setInterval(function() {
    let arr = g[count % g.length];
    t.sendData(arr);
    count++;
}, 1000);
