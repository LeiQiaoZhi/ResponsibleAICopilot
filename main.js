define(["base/js/namespace", "base/js/events"], function (Jupyter, events) {
  let COMMON_MISTAKES =
    "from IPython.display import display, Javascript" +
    '\ndisplay (Javascript ("""require(' +
    '["base/js/dialog"],' +
    "    function(dialog) {" +
    "        dialog.modal({" +
    '            title: "Common falacies",' +
    '            body: "1. Ensure that you consider all groups within a population eg. for gender do not just do male and female groupings' +
    "                   2. Check whether the dataset you are using has inherent biases in it eg. if you use COMPAS racial bias is very likely" +
    "                   3. Remove protected attributes during pre-processing if possible eg. houshold income, race, age and demographic" +
    "                   4. Attempt to prevent overfitting your model eg. impose a limit of 5 on the number of passes you do on the dataset" +
    '                   5. Evaluate your model against some common bias metrics eg. demographic parity and equalised odds",' +
    "            buttons: {" +
    '                "Continue": {}' +
    "            }" +
    "        });" +
    "    }" +
    ');"""))';

  function get_key() {
    console.log("Getting KEY from user block");
    var text = Jupyter.notebook.get_cells()[0].get_text();
    text = text.replace(`"`, ``);
    text = strip_comments(text);
    console.log(`Parsed API KEY: ${text}`);
    return text;
  }

  function initAPIKeyCell() {
    key = get_key();
    console.log(key.length);
    if (key.length < 40 || key.length > 60) {
      Jupyter.notebook.select_prev();
      Jupyter.notebook
        .insert_cell_above()
        .set_text(
          "# This block must be at the top of the notebook to use the ResponsibleCopilot extension\n" +
            "# Paste you API key below.\n" +
            "# You can find your API key at https://platform.openai.com/account/api-keys.\n"
        );
    }
  }

  // removes all comments from code
  function strip_comments(text, out = "") {
    var lines = text.split("\n");
    var answer = new Array();
    var single_comment_flag = false;
    var multi_comment_flag = false;
    var ending_multi_comment_flag = false;
    for (var line = 0; line < lines.length; ++line) {
      for (var i = 0; i < lines[line].length; ++i) {
        if (multi_comment_flag == true) {
          break;
        }
        var temp = new Array();
        if (lines[line][i] == "#") {
          single_comment_flag = true;
          for (var j = 0; j < i; ++j) {
            temp.push(lines[line][j]);
          }
          break;
        } else {
          single_comment_flag = false;
        }
      }

      var temp2 = new Array();
      ending_multi_comment_flag = false;
      for (var i = 0; i < lines[line].length - 2; ++i) {
        if (
          lines[line][i] == '"' &&
          lines[line][i + 1] == '"' &&
          lines[line][i + 2] == '"'
        ) {
          if (multi_comment_flag) {
            multi_comment_flag = false;
            ending_multi_comment_flag = true;
            for (var j = i + 2; j < lines[line].length - 2; ++j) {
              temp2.push(lines[line][j]);
            }
          } else {
            multi_comment_flag = true;
            for (var j = 0; j < i; ++j) {
              temp2.push(lines[line][j]);
            }
          }
        }
      }
      if (
        single_comment_flag == false &&
        multi_comment_flag == false &&
        ending_multi_comment_flag == false
      ) {
        temp = lines[line];
        answer.push(temp);
      } else {
        if (multi_comment_flag == true || ending_multi_comment_flag == true) {
          answer.push(temp2);
        } else {
          answer.push(temp);
        }
      }
    }

    var arrayToString = function (array) {
      var str = "";
      array.forEach(function (a) {
        var item = "";
        for (var i = 0; i < a.length; ++i) {
          item = item + a[i];
        }
        str = str ? str + "\n" + item : item;
      });
      return str;
    };
    var str = arrayToString(answer);
    out = str;
    return out;
  }

  async function OpenAI_response(prompt, params) {
    var token = get_key();

    params = params || {};
    params["max_tokens"] = params["max_tokens"] || 50;
    params["temperature"] = params["temperature"] || 0.5;
    params["presence_penalty"] = params["presence_penalty"] || 0;
    params["frequency_penalty"] = params["frequency_penalty"] || 0;
    params["best_of"] = params["best_of"] || 1;
    params["n"] = params["n"] || 1;
    //params['stop'] = params['stop'] || ['\n', '\r', '\r\n'];

    params["model"] = params["model"] || "text-davinci-003";
    params["prompt"] = prompt;
    console.log(params);

    console.log("Calling GPT3");
    let url = "https://api.openai.com/v1/completions";
    let bearer = "Bearer " + token;
    var openAiResponse = null;
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: bearer,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    })
      .then((response) => {
        console.log("RESPONSE:", response);
        return response.json();
      })
      .then((data) => {
        if (data.hasOwnProperty("error")) {
          return data["error"]["message"];
        }
        console.log("data", data);
        console.log("type", typeof data);
        console.log("keys", Object.keys(data));
        console.log("text", data["choices"][0].text);
        openAiResponse = data["choices"][0].text;
        return data["choices"][0].text;
      })
      .catch((error) => {
        console.log("Something bad happened " + error);
      });

    //console.log("GPT3 response: " + openAiResponse);
    //return openAiResponse;
  }

  function generate_YesNo(code) {
    // return (
    //   code +
    //   "\n" +
    //   "Does this code introduce bias (continue with 'YES' or 'NO')?\n"
    // );
    return (
      code +
      "\n" +
      "Tell me whether the above python code about machine learning has any potential of introducing algorithmic bias. " +
      "Give an Yes or No answer. If the answer is Yes, then give an explanation and some suggestions to eliminate the bias. " +
      "Otherwise just answer No.\n"
    );
  }

  function generate_explanation(code) {
    return (
      code + "\n" + "Explain (in 10-15 words) why this code introduces bias!\n"
    );
  }

  function get_selected_codes() {
    let cells = Jupyter.notebook.get_selected_cells();
    let codes = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].cell_type === "code") {
        codes.push(cells[i].get_text());
      }
    }
    return codes;
  }

  async function check_cell() {
    let codes = get_selected_codes();
    let content = "";

    let example_code = "";
    for (let i = 0; i < codes.length; i++) {
      example_code += codes[i] + "\n";
    }

    example_code = strip_comments(example_code);

    let openai_response_yesno = await OpenAI_response(
      generate_YesNo(example_code),
      { max_tokens: 500 }
    );
    console.log("GPT3 response: " + openai_response_yesno);
    content += "Does the code introduce bias?\n";
    content += openai_response_yesno;
    // console.log(
    //   (openai_response_yesno == "Yes") |
    //     (openai_response_yesno == "YES") |
    //     (openai_response_yesno == "\nYes") |
    //     (openai_response_yesno == "\nYES")
    // );
    // if (
    //   (openai_response_yesno == "Yes") |
    //   (openai_response_yesno == "YES") |
    //   (openai_response_yesno == "\nYes") |
    //   (openai_response_yesno == "\nYES")
    // ) {
    //   let openai_response_explain = await OpenAI_response(
    //     generate_explanation(example_code),
    //     { max_tokens: 100 }
    //   );
    //   console.log("GPT3 response: " + openai_response_explain);
    //   content += "\n\n";
    //   content += "Explanation:\n";
    //   content += openai_response_explain;
    // }

    Jupyter.notebook.insert_cell_below("markdown").set_text(content);
    Jupyter.notebook.select_next();
    Jupyter.notebook.select_prev();
  }

  let defaultCellButton = function () {
    Jupyter.toolbar.add_buttons_group([
      Jupyter.keyboard_manager.actions.register(
        {
          help: "Check current cell",
          icon: "fa-play-circle",
          handler: check_cell,
        },
        "check-cell",
        "Check cell"
      ),
    ]);
  };

  async function info_button() {
    Jupyter.notebook.insert_cell_below("code").set_text(COMMON_MISTAKES);
    Jupyter.notebook.select_next();
    Jupyter.notebook.execute_cell();
    Jupyter.notebook.cut_cell();
  }
  let infoButton = function () {
    Jupyter.toolbar.add_buttons_group([
      Jupyter.keyboard_manager.actions.register(
        {
          help: "Common falacies",
          icon: "fa-info-circle",
          handler: info_button,
        },
        "check-cell",
        "Info"
      ),
    ]);
  };

  async function insert_model_bias_cell() {
    var code =
      '"""\n' +
      "View model(s)'s performance and fairness in the Fairness Dashboard\n" +
      "\n" +
      "Fairness metrics (see in the dashboard):\n" +
      "    Demographic Parity: measures whether predictions are independent of sensitive features\n" +
      "    Equalized Odds: measures whether the model performs equally well for different groups\n" +
      "\n" +
      "Parameters:\n" +
      "    dataset (numpy.ndarray (structured), dict, or pandas.DataFrame): the dataset of the model(s)'s input\n" +
      "    sensitive_attr_names (list[str]): the list of names of sensitive features in the dataset\n" +
      "    y_true (numpy.ndarray, or list[]): the array of true labels corresponding to each input data\n" +
      "    y_pred (numpy.ndarray, list[], or dict {str : list[]}): the prediction array of model(s)\n" +
      "        Single model: single array of predicitons\n" +
      "        Multiple models: a dictionary of format {model name : model's predictions}\n" +
      "\n" +
      "See also:\n" +
      "    Fairness metrics: https://fairlearn.org/main/user_guide/assessment/common_fairness_metrics.html\n" +
      "    FairnessDashboard documentation: https://fairlearn.org/v0.6.2/api_reference/fairlearn.widget.html\n" +
      '"""\n' +
      "from jupyter_contrib_nbextensions.nbextensions.ai_copilot.bias_metrics.testBiasModel import test_bias_model\n" +
      'test_bias_model(dataset="""replace this with your input dataset""",\n' +
      '         sensitive_attr_names="""replace this with the name list of sensitive features""",\n' +
      '         y_true="""replace this with your true label array""",\n' +
      '         y_pred="""replace this with your predictions from the model(s)""")';

    Jupyter.notebook.insert_cell_below("code").set_text(code);
    Jupyter.notebook.select_next();
  }

  async function insert_dataset_bias_cell() {
    var code =
      '"""\n' +
      "Evaluate a dataset's fairness\n" +
      "\n" +
      "Discrimination metric: dependence rate of y_true label on sensitive features\n" +
      "    Fomula: the difference between lowest & highest P(y|d) for each sensitive feature,\n" +
      "        where y is the advantageous (favorable) label(s), d takes sensitive feature values.\n" +
      "        The difference is computed based on distance function J(x,y) = abs(x/y - 1).\n" +
      "\n" +
      "Parameters:\n" +
      "    dataset (numpy.ndarray (structured), dict, or pandas.DataFrame): the dataset\n" +
      "    sensitive_attr_names (list[str]): the list of names of sensitive features in the dataset\n" +
      "    y_true (numpy.ndarray, or list[]): the array of true labels corresponding to each input data\n" +
      "    y_advantage_labels (list[], or a value): the value(s) for advantageous (favorable) label(s)\n" +
      "\n" +
      "See also:\n" +
      "    Optimized Data Pre-Processing for Discrimination Prevention (Calmon et al., 2017)\n" +
      '"""\n' +
      "%matplotlib inline\n" +
      "from jupyter_contrib_nbextensions.nbextensions.ai_copilot.bias_metrics.testDatasetBias import test_bias_dataset\n" +
      'test_bias_dataset(dataset="""replace this with your dataset""",\n' +
      '         sensitive_attr_names="""replace this with the name list of sensitive features""",\n' +
      '         y_true="""replace this with your true label array""",\n' +
      '         y_advantage_labels="""replace this with advantageous label values""")';

    Jupyter.notebook.insert_cell_below("code").set_text(code);
    Jupyter.notebook.select_next();
  }

  let metricsButton = function () {
    var actionModel = {
      icon: "fa-bar-chart-o",
      help: "Insert a cell for model bias evaluation",
      handler: insert_model_bias_cell,
    };
    var actionDataset = {
      icon: "fa-table",
      help: "Insert a cell for dataset discrimination evaluation",
      handler: insert_dataset_bias_cell,
    };
    Jupyter.toolbar.add_buttons_group([
      Jupyter.actions.register(actionModel, "model-bias-cell", "Metrics"),
      Jupyter.actions.register(actionDataset, "dataset-bias-cell", "Metrics"),
    ]);
  };

  // Run on start
  function load_ipython_extension() {
    initAPIKeyCell();
    defaultCellButton();
    infoButton();
    metricsButton();
  }

  return {
    load_ipython_extension: load_ipython_extension,
  };
});
