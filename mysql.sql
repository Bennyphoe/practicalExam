CREATE TABLE Test2 (
  `id` int NOT NULL AUTO_INCREMENT,
  `devicename` varchar(255) NOT NULL,
  `temp` int NOT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`)
);

INSERT INTO test2(devicename, temp, timestamp) VALUES ("test", 23, now());
