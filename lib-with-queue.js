const wpi = require('wiring-pi');
wpi.setup("gpio");

//
//      A
//     ---
//  F |   | B
//     -G-
//  E |   | C
//     ---
//      D
codigitToSegment = [
    // XGFEDCBA
    0b00111111, // 0
    0b00000110, // 1
    0b01011011, // 2
    0b01001111, // 3
    0b01100110, // 4
    0b01101101, // 5
    0b01111101, // 6
    0b00000111, // 7
    0b01111111, // 8
    0b01101111, // 9
    0b01110111, // A
    0b01111100, // b
    0b00111001, // C
    0b01011110, // d
    0b01111001, // E
    0b01110001 // F
];


module.exports = class TM1637Display {

    constructor(pinClk, pinDIO, trueValue = 1) {
        this.pinClk = pinClk;
        this.pinDIO = pinDIO;
        this.trueValue = trueValue;
        this.q = [];

        // 默认高电位
        wpi.pinMode(this.pinClk, wpi.OUTPUT);
        wpi.pinMode(this.pinDIO, wpi.OUTPUT);
        this.high(this.pinClk);
        this.high(this.pinDIO);

        let q = this.q;
        (function loop() {
            let act = q.shift();
            if (act) wpi.digitalWrite(act[0], act[1]);
            setTimeout(loop, 1);
        })();
    }

    high(pin) {
        this.q.push([pin, this.trueValue]);
    }

    low(pin) {
        this.q.push([pin, 1 - this.trueValue]);
    }

    // clock high in, high out
    start() {
        // pinDIO  high -> low when clock is high
        // this.high(this.pinDIO);
        // this.high(this.pinClk);
        this.low(this.pinDIO);
    }

    // clock high in, high out
    writeBit(value) {
        // 一个上升沿
        this.low(this.pinClk);
        // change the value when clock is low
        if (value)
            this.high(this.pinDIO);
        else
            this.low(this.pinDIO);

        this.high(this.pinClk);
    }

    readAck() {
        // 8号下降沿
        this.low(this.pinClk);
        wpi.pinMode(this.pinDIO, wpi.INPUT);
        // 9号上升沿
        this.high(this.pinClk);
        const ack = wpi.digitalRead(this.pinDIO);
        // if(ack === 0)  scucces, low
        wpi.pinMode(this.pinDIO, wpi.OUTPUT);
        // 9号下降沿
        this.low(this.pinClk);
        // console.log(ack);
        return ack;
    }

    // clock high in, low out
    writeByte(byte) { // 0b00000000
        let b = byte;
        for (let i = 0; i < 8; i++) {
            this.writeBit(b & 0x01);
            b >>= 1;
        }
        return this.readAck();
    }

    // clock low in, high out
    stop() {
        // pinDIO  low -> high  when clock is high
        this.low(this.pinDIO);
        this.high(this.pinClk);
        this.high(this.pinDIO);
    }

    sendData(nums) { // 
        this.start(); // 数据命令设置
        this.writeByte(0b01000000); // 普通模式, 自动地址增加, 写数据到显示寄存器
        this.stop();

        this.start(); // 地址命令设置
        this.writeByte(0b11000000 + (0b11 & (4 - nums.length))); // 地址起始位
        nums.forEach(n => this.writeByte(codigitToSegment[n])); // 数据
        this.stop();

        this.start(); // 显示控制
        this.writeByte(0b10001111); // 显示控制命令设置, 开, 亮度为 111
        this.stop();

    }
}
