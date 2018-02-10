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

const sleep = () => new Promise((r) => setTimeout(r, 1));

module.exports = class TM1637Display {

    constructor(pinClk, pinDIO, trueValue = 1) {
        this.pinClk = pinClk;
        this.pinDIO = pinDIO;
        this.trueValue = trueValue;

        // 默认高电位
        wpi.pinMode(this.pinClk, wpi.OUTPUT);
        wpi.pinMode(this.pinDIO, wpi.OUTPUT);
        wpi.digitalWrite(this.pinClk, this.trueValue);
        wpi.digitalWrite(this.pinDIO, this.trueValue);
        // this.high(this.pinClk);
        // this.high(this.pinDIO);

    }

    async high(pin) {
        wpi.digitalWrite(pin, this.trueValue);
        await sleep();
    }

    async low(pin) {
        wpi.digitalWrite(pin, 1 - this.trueValue);
        await sleep();
    }

    // clock high in, high out
    async start() {
        // pinDIO  high -> low when clock is high
        // this.high(this.pinDIO);
        // this.high(this.pinClk);
        await this.low(this.pinDIO);
    }

    // clock high in, high out
    async writeBit(value) {
        // 一个上升沿
        await this.low(this.pinClk);
        // change the value when clock is low
        if (value)
            await this.high(this.pinDIO);
        else
            await this.low(this.pinDIO);

        await this.high(this.pinClk);
    }
    async readAck() {
        // 8号下降沿
        await this.low(this.pinClk);
        wpi.pinMode(this.pinDIO, wpi.INPUT);
        // 9号上升沿
        await this.high(this.pinClk);
        const ack = wpi.digitalRead(this.pinDIO);
        // if(ack === 0)  scucces, low
        wpi.pinMode(this.pinDIO, wpi.OUTPUT);
        // 9号下降沿
        await this.low(this.pinClk);
        // console.log(ack);
        return ack;
    }

    // clock high in, low out
    async writeByte(byte) { // 0b00000000
        let b = byte;
        for (let i = 0; i < 8; i++) {
            await this.writeBit(b & 0x01);
            b >>= 1;
        }
        return await this.readAck();
}

    // clock low in, high out
    async stop() {
        // pinDIO  low -> high  when clock is high
        await this.low(this.pinDIO);
        await this.high(this.pinClk);
        await this.high(this.pinDIO);
    }

    async sendData(nums, split = false) {
        let numsEncoded = [0, 0, 0, 0].map((u, i) => codigitToSegment[nums[i]] || 0);
        if (split) numsEncoded[1] = numsEncoded[1] | 0b10000000; // the x of 2nd pos

        await this.start(); // 数据命令设置
        await this.writeByte(0b01000000); // 普通模式, 自动地址增加, 写数据到显示寄存器
        await this.stop();

        await this.start(); // 地址命令设置
        await this.writeByte(0b11000000); // 地址起始位 从0开始
        for (let i = 0; i < numsEncoded.length; i++) {
            await this.writeByte(numsEncoded[i]);
        }
        await this.stop();

        await this.start(); // 地址命令设置
        await this.writeByte(0b10001111); // 显示控制命令设置, 开, 亮度为 111
        await this.stop();
    }
}