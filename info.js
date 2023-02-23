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

  // Run on start
  function load_ipython_extension() {
    infoButton();
  }

  return {
    load_ipython_extension: load_ipython_extension,
  };
});
