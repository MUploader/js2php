<?php
class Date extends Object {
  public $className = "Date";
  /* @var DateTime - date object; second accuracy only; "local" timezone */
  public $date = null;
  /* @var int - ms since 01/01/1970 UTC */
  public $value = null;

  static $LOCAL_TZ = null;
  static $protoObject = null;
  static $classMethods = null;
  static $protoMethods = null;

  function __construct() {
    parent::__construct();
    $this->proto = self::$protoObject;
    if (func_num_args() > 0) {
      $this->init(func_get_args());
    }
  }

  function init($arr) {
    $len = count($arr);
    if ($len === 1 && is_string($arr[0])) {
      $this->_initFromString($arr[0]);
    } else {
      $this->_initFromParts($arr);
    }
  }

  function _initFromString($str) {
    $tz = (substr($str, -1) === 'Z') ? 'UTC' : null;
    $arr = self::parse($str);
    $this->_initFromParts($arr, $tz);
  }

  function _initFromParts($arr, $tz = null) {
    $len = count($arr);
    if ($len === 1) {
      $ms = $arr[0];
      $this->value = (float)$ms;
      $this->date = self::fromValue($ms);
      return;
    }
    //allow 0 - 7 parts; default value for each part is 0
    $arr = array_pad($arr, 7, 0);
    $date = self::create($tz);
    if ($len > 1) {
      $date->setDate($arr[0], $arr[1] + 1, $arr[2]);
      $date->setTime($arr[3], $arr[4], $arr[5]);
      $ms = $arr[6];
    } else {
      $seconds = microtime(true);
      $fraction = $seconds - (int)$seconds;
      $ms = (int)($fraction * 1000);
    }
    $this->date = $date;
    $this->value = (float)($date->getTimestamp() * 1000 + $ms);
  }

  function toJSON() {
    $date = self::fromValue($this->value, 'UTC');
    $str = $date->format('Y-m-d\TH:i:s');
    $ms = $this->value % 1000;
    if ($ms < 0) $ms = 1000 + $ms;
    if ($ms < 0) $ms = 0;
    return $str . '.' . substr('00' . $ms, -3) . 'Z';
  }

  static function create($tz = null) {
    if ($tz === null) {
      return new DateTime('now', new DateTimeZone(self::$LOCAL_TZ));
    } else {
      return new DateTime('now', new DateTimeZone($tz));
    }
  }

  static function now() {
    return floor(microtime(true) * 1000);
  }

  static function fromValue($ms, $tz = null) {
    $timestamp = floor($ms / 1000);
    $date = self::create($tz);
    $date->setTimestamp($timestamp);
    return $date;
  }

  static function parse($str) {
    $str = to_string($str);
    $d = date_parse($str);
    //todo: validate $d for errors array and false values
    return array($d['year'], $d['month'] - 1, $d['day'], $d['hour'], $d['minute'], $d['second'], floor($d['fraction'] * 1000));
  }

  /**
   * Creates the global constructor used in user-land
   * @return Func
   */
  static function getGlobalConstructor() {
    $Date = new Func(function() {
      $date = new Date();
      $date->init(func_get_args());
      return $date;
    });
    $Date->set('prototype', Date::$protoObject);
    $Date->setMethods(Date::$classMethods, true, false, true);
    return $Date;
  }
}

Date::$classMethods = array(
  'now' => function() {
      return Date::now();
    },
  'parse' => function($str) {
      $date = new Date($str);
      return $date->value;
    },
  'UTC' => function() {
      $date = new Date();
      $date->_initFromParts(func_get_args(), 'UTC');
      return $date->value;
    }
);

Date::$protoMethods = array(
  'valueOf' => function() {
      $self = Func::getContext();
      return $self->value;
    },
  'toJSON' => function() {
      $self = Func::getContext();
      //2014-08-09T12:00:00.000Z
      return $self->toJSON();
    },
  'toUTCString' => function() {
      $self = Func::getContext();
      $date = Date::fromValue($self->value, 'UTC');
      //Sun, 07 Dec 2014 01:10:08 GMT
      return $date->format('D, d M Y H:i:s') . ' GMT';
    },
  //todo: toISOString
  'toString' => function() {
      $self = Func::getContext();
      //Sat Aug 09 2014 12:00:00 GMT+0000 (UTC)
      return str_replace('~', 'GMT', $self->date->format('D M d Y H:i:s ~O (T)'));
    }
);

Date::$protoObject = new Object();
Date::$protoObject->setMethods(Date::$protoMethods, true, false, true);

//get the local timezone by looking for constant or environment variable; default to UTC
Date::$LOCAL_TZ = defined('LOCAL_TZ') ? constant('LOCAL_TZ') : getenv('LOCAL_TZ');
if (Date::$LOCAL_TZ === false) {
  Date::$LOCAL_TZ = 'UTC';
}
