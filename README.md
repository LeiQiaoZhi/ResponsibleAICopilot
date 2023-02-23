# AI Copilot

## Setup

1. Install Jupyter Notebook with the following command:
   `pip install notebook`

2. Install Notebook extensions using the following command:
   `pip install jupyter_contrib_nbextensions`

3. Find the path of the jupyter_contrib_nbextensions, save the path somewhere, so cou can find it later
   (you can see the path in the terminal when the extension is being installed).
   or use `pip show jupyter_contrib_nbextensions`

How to install the extension:

1. Copy the entire `ai_copilot` folder into the `[source]/juptyer_contrib_nbextensions/nbextensions` folder.
2. Run the following commands in the terminal:

```
   jupyter nbextension install ai_copilot
   jupyter nbextension enable ai_copilot/main
   jupyter notebook
```

3. Open `TestNotebook.ipynb` to see the extension in action.
