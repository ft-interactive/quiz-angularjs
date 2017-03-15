import angular from 'angular';
import ngAnimate from 'angular-animate';
import ngRoute from 'angular-route';
import ngSanitize from 'angular-sanitize';
import velocity from 'velocity-animate';

// App module
const app = angular.module('quizApp', [
  ngAnimate,
  ngRoute,
  ngSanitize,
  require('angular-socialshare')
]);

// Results radial gauge
const rg = document.getElementById('radial-gauge');
const total = document.getElementById('total');
const score = document.getElementById('score');
const x = (rg.getAttribute('width') / 2).toFixed(2);
const y = (rg.getAttribute('height') / 2).toFixed(2);
const strokeWidth = 20;
const radius = y - (strokeWidth / 2);
const circumference = (2 * Math.PI * radius).toFixed(2);

// Radial gauge helper function
function setAttributes(el, attrs) {
  for (const key in attrs) {
    if ({}.hasOwnProperty.call(attrs, key)) {
      el.setAttribute(key, attrs[key]);
    }
  }
}

setAttributes(total, {
  cx: x,
  cy: y,
  r: radius,
  fill: 'none',
  stroke: '#cec6b9',
  'stroke-width': strokeWidth,
});

setAttributes(score, {
  cx: x,
  cy: y,
  r: radius,
  fill: 'none',
  stroke: '#458b00',
  'stroke-width': strokeWidth,
  'stroke-dasharray': circumference,
  'stroke-dashoffset': circumference,
});

// Routes
app.config(['$locationProvider', $locationProvider => {
  // Use the HTML5 history API
  $locationProvider.html5Mode(true);
}]);

// Controllers
app.controller('QuizCtrl', ['$scope', '$http', $scope => {
  $scope.questions = [];
  $scope.choices = [];
  $scope.currentQuestion = {
    value: 0
  };
  $scope.userScore = {
    value: 0
  };
  $scope.quizStatus = {
    isOver: false
  };
  $scope.message = {
    text: null,
    para: null,
  };

  angular.forEach(window.quiz.data, row => {
    $scope.questions.push(row);
    $scope.choices.push([row.choice1, row.choice2, row.choice3]);
  });
}]);

app.controller('QuestionCtrl', ['$scope', '$timeout', '$window', '$http',
  ($scope, $timeout, $window, $http) => {
    $scope.submitAnswer = function () {
      let scoreProportion = {};
      $scope.answerSubmitted = true;
      $scope.userAnswer = this.choice;
      $scope.correctAnswer = $scope.questions[$scope.currentQuestion.value].answer;

      // If this is the first question, log a start in GA
      if ($scope.currentQuestion.value === 0) {
        $window.ga('send', 'event', 'Starts', 'Quiz Started', 'Quiz Started');
      }

      // Check to see if userAnswer is correct
      if ($scope.userAnswer === $scope.correctAnswer) {
        $scope.isCorrect = true;
        $scope.userScore.value++;
        // Log correct answer in GA
        $window.ga('send', 'event',
          ($scope.currentQuestion.value < 10 ? '0' : null) +
          ($scope.currentQuestion.value + 1) + '. ' +
          $scope.questions[$scope.currentQuestion.value].question,
          'Answer Submitted', $scope.userAnswer + '*');
      } else {
        // Log incorrect answer in GA
        $window.ga('send', 'event',
          ($scope.currentQuestion.value < 10 ? '0' : null) +
          ($scope.currentQuestion.value + 1) + '. ' +
          $scope.questions[$scope.currentQuestion.value].question,
          'Answer Submitted', $scope.userAnswer);
      }

      console.log(`question: ${$scope.currentQuestion.value}, ` +
        `correct: ${$scope.isCorrect}, score: ${$scope.userScore.value}`);

      // Display result splash
      if ($scope.answerSubmitted) {
        $scope.showSplash = true;
        $timeout(() => {
          $scope.showSplash = false;
        }, 250);
      }

      // Update progress bar
      const progress = ($scope.currentQuestion.value + 1) * 9.09;
      document.querySelector('.progress-bar').style.width = `${progress}%`;

      // console.log(window.responses.data[$scope.userScore.value].percentage);

      function message() {
        switch ($scope.userScore.value) {
          default:
            $scope.message.text = '0-3 category message';
            break;
          case 4:
          case 5:
          case 6:
            $scope.message.text = '4-6 category message';
            break;
          case 7:
          case 8:
          case 9:
            $scope.message.text = '7-9 category message';
            break;
          case 10:
          case 11:
            $scope.message.text = '10+ category message';
        }
      }

      function submit() {
        const baseURL = 'https://docs.google.com/a/ft.com/forms/d/e/1FAIpQLSfoF6T9t1IGLNJat8JSw_HrxkWPyrxd2mfsH2LieGl7wteU9A/formResponse?entry.550613996=';
        const submitURL = (baseURL + $scope.userScore.value);

        $http({
          method: 'POST',
          url: submitURL,
        }).then(function success(response) {
            // this callback will be called asynchronously
            // when the response is available
          return;
        }, function error(response) {
          // called asynchronously if an error occurs
          // or server returns response with an error status.
          console.log(`Server responded with status ${response.status}`);
        });
      }

      // Check to see if quiz is over
      if ($scope.currentQuestion.value === $scope.questions.length - 1) {
        message();

        score.setAttribute('transform', `rotate(-90, ${x}, ${y})`);

        scoreProportion = $scope.userScore.value / $scope.questions.length;

        $scope.quizStatus.isOver = true;

        velocity(score, {
          'stroke-dashoffset': circumference - (circumference * scoreProportion)
        }, {
          duration: 1500,
          easing: 'easeInOutCubic'
        });

        // Submit score via Google Form
        // submit();

        // Log completion and score in GA
        $window.ga('send', 'event', 'Completions', 'Quiz Completed');
        $window.ga('send', 'event', 'Completions', 'Score',
          $scope.userScore.value + ' out of 10');
        $window.ga('send', 'event', 'Completions', 'Score', 'Total Score',
          $scope.userScore.value);
      } else {
        $scope.currentQuestion.value++;
      }
    };
  }
]);
