const co = require("co");
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

const delay = () => new Promise((r) => setTimeout(r, 1));

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

    high(pin) {
        const self = this;
        return co(function*() {
            wpi.digitalWrite(pin, self.trueValue);
            yield delay();
        });
    }

    low(pin) {
        const self = this;
        return co(function*() {
            wpi.digitalWrite(pin, 1 - self.trueValue);
            yield delay();
        });
    }

    // clock high in, high out
    start() {
        const self = this;
        return co(function*() {
            // pinDIO  high -> low when clock is high
            // self.high(self.pinDIO);
            // self.high(self.pinClk);
            yield self.low(self.pinDIO);
        });
    }

    // clock high in, high out
    writeBit(value) {
        const self = this;
        return co(function*() {
            // 一个上升沿
            yield self.low(self.pinClk);
            // change the value when clock is low
            if (value)
                yield self.high(self.pinDIO);
            else
                yield self.low(self.pinDIO);

            yield self.high(self.pinClk);
        });
    }
    readAck() {
        const self = this;
        return co(function*() {
            // 8号下降沿
            yield self.low(self.pinClk);
            wpi.pinMode(self.pinDIO, wpi.INPUT);
            // 9号上升沿
            yield self.high(self.pinClk);
            const ack = wpi.digitalRead(self.pinDIO);
            // if(ack === 0)  scucces, low
            wpi.pinMode(self.pinDIO, wpi.OUTPUT);
            // 9号下降沿
            yield self.low(self.pinClk);
            // console.log(ack);
            return ack;
        });
    }

    // clock high in, low out
    writeByte(byte) { // 0b00000000
        const self = this;
        return co(function*() {
            let b = byte;
            for (let i = 0; i < 8; i++) {
                yield self.writeBit(b & 0x01);
                b >>= 1;
            }
            return yield self.readAck();
        });
    }

    // clock low in, high out
    stop() {
        const self = this;
        return co(function*() {
            // pinDIO  low -> high  when clock is high
            yield self.low(self.pinDIO);
            yield self.high(self.pinClk);
            yield self.high(self.pinDIO);
        });
    }

    sendData(nums) { // 
        const self = this;
        return co(function*() {
            yield self.start(); // 数据命令设置
            yield self.writeByte(0b01000000); // 普通模式, 自动地址增加, 写数据到显示寄存器
            yield self.stop();

            yield self.start(); // 地址命令设置
            yield self.writeByte(0b11000000 + (0b11 & (4 - nums.length))); // 地址起始位
            for (let i = 0; i < nums.length; i++) {
                yield self.writeByte(codigitToSegment[nums[i]] || 0);
            }
            yield self.stop();

            yield self.start(); // 地址命令设置
            yield self.writeByte(0b10001111); // 显示控制命令设置, 开, 亮度为 111
            yield self.stop();
        });
    }
}




